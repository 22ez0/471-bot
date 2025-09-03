import {
  Message,
  ChannelType,
  PermissionFlagsBits,
  GuildMember,
} from "discord.js";

// ================== CONFIG RÁPIDA ==================
// IDs de cargos para marcar no 2º aviso (máx. 2). Coloque no Secrets como: ALERT_ROLE_IDS=123,456
const ALERT_ROLE_IDS: string[] = (process.env.ALERT_ROLE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// (Opcional) IDs de cargos que SEMPRE podem tudo (whitelist)
const ADMIN_ROLE_IDS: string[] = (process.env.ADMIN_ROLE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Nomes que vamos considerar como admin (além de quem tem permissão Administrator)
const ADMIN_ROLE_NAMES = ["𝐀dm", "Adm", "Administrador"];

// ================== ESTADO ==================
let modEnabled = false;               // .mod liga/desliga
const spamChannels = new Set<string>(); // .mod1 define os canais

// flood por usuário (por servidor)
type SpamState = { count: number; lastTime: number; warns: number };
const userSpam: Map<string, SpamState> = new Map();

// ================== DETECÇÃO ==================
// Normaliza strings (remove acentos e baixa)
function normalize(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
// Para anti-palavra: converte leet -> letra
function normalizeForBadWords(s: string) {
  return normalize(s)
    .replace(/4/g, "a")
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/0/g, "o")
    .replace(/5/g, "s");
}

// Palavras/proposições proibidas (adicione à vontade)
const blockedListBase = [
  "cp",
  "lulz",
  "gore",
  "gorda",
  "rape",
  "estrupo",
  "estupro",
  "estuprar",
  "estuprado",
  "estuprada",
  "matar gato",
  "matar cachorro",
];

const blockedList = blockedListBase.map((w) => normalizeForBadWords(w));

// Regex de links gerais e convites do Discord (pega http, https e www)
const urlRegex =
  /\b(?:(?:https?:\/\/)|(?:www\.))[\w-]+(?:\.[\w.-]+)+(?:[^\s<]*)/i;
const inviteRegex =
  /(discord(?:app)?\.com\/invite\/|discord\.gg\/)[\w-]+/i;

// Variante "colada" (remove espaços e pontuações) para detectar convites disfarçados
function suspicious(text: string) {
  const collapsed = text.replace(/[\s<>\[\]\(\)\-_=+,.]+/g, "").toLowerCase();
  return (
    collapsed.includes("discord.gg/") ||
    collapsed.includes("discord.com/invite/") ||
    collapsed.includes("discordapp.com/invite/")
  );
}

// ================== REGRAS ==================
function memberIsStaff(m?: GuildMember | null) {
  if (!m) return false;
  if (m.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (ADMIN_ROLE_IDS.some((id) => m.roles.cache.has(id))) return true;
  const allNames = normalize(m.roles.cache.map((r) => r.name).join(" "));
  return ADMIN_ROLE_NAMES.some((n) => allNames.includes(normalize(n)));
}

// ================== COMANDOS ==================
export async function handleModCommand(message: Message) {
  if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply(" Apenas imenso pode usar este comando.");
  }
  modEnabled = !modEnabled;
  await message.reply(
    modEnabled
      ? " Automod ativado (anti-links, convites, palavras proibidas)."
      : " Automod desativado."
  );
}

export async function handleMod1Command(message: Message, args: string[]) {
  if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply(" apenas membros da alta cupula podem usar este comando.");
  }

  // aceitar menções e/ou IDs passados em texto
  const mentioned = message.mentions.channels.map((c) => c.id);
  for (const id of mentioned) spamChannels.add(id);

  for (const a of args) {
    const id = a.replace(/[<#>]/g, "").trim();
    if (/^\d{16,20}$/.test(id)) spamChannels.add(id);
  }

  if (spamChannels.size === 0) {
    return message.reply(
      " Use: `.mod1 #canal [#outrocanal ...]` (pode mencionar vários)."
    );
  }

  const labels = [...spamChannels].map((id) => `<#${id}>`).join(", ");
  await message.reply(
    ` Anti-spam/CAPS ativo nos canais: ${labels}\n• 5 msgs/5s → timeout **15s**\n• Reincidência → timeout **5min** + aviso aos admins`
  );
}

// ================== AUTOMOD (chame em toda mensagem) ==================
export async function automodCheck(message: Message) {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!modEnabled) return;

  // Staff passa batido
  if (memberIsStaff(message.member)) return;

  const me = message.guild.members.me;
  const canDelete = me?.permissions.has(PermissionFlagsBits.ManageMessages);
  const canTimeout = me?.permissions.has(PermissionFlagsBits.ModerateMembers);

  const content = message.content || "";

  // 1) ANTI-LINK + ANTI-INVITE (apaga qualquer link, inclusive convites)
  if (urlRegex.test(content) || inviteRegex.test(content) || suspicious(content)) {
    if (canDelete) {
      await message.delete().catch(() => {});
    }
    await message.channel
      .send(`${message.author}, nao envia link seu doente`)
      .catch(() => {});
    return;
  }

  // 2) PALAVRAS PROIBIDAS (variações simples)
  const normalized = normalizeForBadWords(content);
  for (const bad of blockedList) {
    if (normalized.includes(bad)) {
      if (canDelete) await message.delete().catch(() => {});
      await message.channel
        .send(`${message.author}, pode nao mankkk.`)
        .catch(() => {});
      return;
    }
  }

  // 3) CAPSLOCK (nos canais configurados)
  if (spamChannels.has(message.channel.id)) {
    if (
      content.length > 5 &&
      content === content.toUpperCase() &&
      /[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ]/.test(content)
    ) {
      if (canDelete) await message.delete().catch(() => {});
      return;
    }
  }

  // 4) ANTI-SPAM (5 mensagens em 5s) nos canais configurados
  if (spamChannels.has(message.channel.id)) {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const state = userSpam.get(key) || { count: 0, lastTime: now, warns: 0 };

    if (now - state.lastTime <= 5000) {
      state.count += 1;
    } else {
      state.count = 1;
    }
    state.lastTime = now;

    if (state.count >= 5) {
      state.count = 0;
      state.warns += 1;

      if (canTimeout) {
        try {
          if (state.warns === 1) {
            await message.member?.timeout(15 * 1000, "flood de mensagens");
            await message.channel.send(
              `${message.author}, você foi silenciado por **15s** (flood).`
            );
          } else {
            await message.member?.timeout(5 * 60 * 1000, "Flood repetido");
            const mentions =
              ALERT_ROLE_IDS.slice(0, 2).map((id) => `<@&${id}>`).join(" ") ||
              "";
            await message.channel.send(
              `${mentions} 🚨 ${message.author} reincidiu no flood e foi silenciado por **5min**.`
            );
          }
        } catch (e) {
          console.error("Erro ao aplicar timeout:", e);
        }
      }
    }

    userSpam.set(key, state);
  }
}
