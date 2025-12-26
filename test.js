import {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";
import axios from "axios";
import express from "express";
import "dotenv/config";

const DEFAULT_TONE = "friendly";
const DEFAULT_LENGTH = "short";

/* ======================
   CLIENT
====================== */

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
});

/* ======================
   MEMORY (per user)
====================== */

const memory = new Map();

/* ======================
   COMMANDS
====================== */

const toneChoices = [
    { name: "Casual", value: "casual" },
    { name: "Friendly", value: "friendly" },
    { name: "Polite", value: "polite" },
    { name: "Professional", value: "professional" },
    { name: "Flirty", value: "flirty" }
];

const lengthChoices = [
    { name: "Short", value: "short" },
    { name: "Medium", value: "medium" },
    { name: "Long", value: "long" }
];

const commands = [
    new SlashCommandBuilder()
        .setName("suggest")
        .setDescription("Suggest reply options")
        .addStringOption(o =>
            o.setName("message")
                .setDescription("Paste message")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("tone")
                .setDescription("Tone")
                .addChoices(...toneChoices)
        )
        .addStringOption(o =>
            o.setName("length")
                .setDescription("Length")
                .addChoices(...lengthChoices)
        ),

    new SlashCommandBuilder()
        .setName("rewrite")
        .setDescription("Rewrite your draft")
        .addStringOption(o =>
            o.setName("text")
                .setDescription("Your message")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("tone")
                .setDescription("Tone")
                .addChoices(...toneChoices)
        )
        .addStringOption(o =>
            o.setName("length")
                .setDescription("Length")
                .addChoices(...lengthChoices)
        )
].map(c => c.toJSON());

/* ======================
   REGISTER
====================== */

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
    await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
    );
    console.log("✅ Slash commands registered");
}

/* ======================
   OPENROUTER
====================== */

async function askAI(prompt) {
    const res = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            model: process.env.OPENROUTER_MODEL,
            messages: [{ role: "user", content: prompt }]
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": "auto-suggestion",
                "X-Title": "Auto Suggestion Bot"
            }
        }
    );
    return res.data.choices[0].message.content.trim();
}

/* ======================
   BUTTONS (per option)
====================== */

function optionButtons(index) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`copy_${index}`)
            .setLabel("📋 Copy")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId(`rewrite_${index}`)
            .setLabel("🔁 Rewrite")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId(`shorter_${index}`)
            .setLabel("✂ Shorter")
            .setStyle(ButtonStyle.Secondary)
    );
}

/* ======================
   INTERACTIONS
====================== */

client.on("interactionCreate", async interaction => {

    /* ---------- SLASH ---------- */
    if (interaction.isChatInputCommand()) {

        if (interaction.guild) {
            return interaction.reply({ content: "❌ DM-only bot.", ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const selectedTone = interaction.options.getString("tone");
        const selectedLength = interaction.options.getString("length");

        const tone = selectedTone ?? DEFAULT_TONE;
        const length = selectedLength ?? DEFAULT_LENGTH;

        const usedDefaults = !selectedTone || !selectedLength;

        /* ----- SUGGEST ----- */
        if (interaction.commandName === "suggest") {
            const message = interaction.options.getString("message");

            const prompt = `
You are a personal chat reply assistant.

Tone: ${tone}
Length: ${length}

Reply in the SAME language.
Generate exactly 3 natural replies.
No explanations.

Message:
"${message}"
`;

            const result = await askAI(prompt);
            const replies = result.split("\n").filter(Boolean).slice(0, 3);

            memory.set(interaction.user.id, replies);

            await interaction.editReply(
                `💡 **Suggested replies (${tone}, ${length}${usedDefaults ? " · ✨" : ""})**`
            );

            for (let i = 0; i < replies.length; i++) {
                await interaction.followUp({
                    content: `🟦 **Option ${i + 1}**\n${replies[i]}`,
                    components: [optionButtons(i)],
                    ephemeral: true
                });
            }
        }

        /* ----- REWRITE ----- */
        if (interaction.commandName === "rewrite") {
            const text = interaction.options.getString("text");

            const prompt = `
Improve this message.

Tone: ${tone}
Length: ${length}

Same language.
Natural.

Text:
"${text}"
`;

            const improved = await askAI(prompt);

            await interaction.editReply(
                `✨ **Improved version**\n\n${improved}`
            );
        }
    }

    /* ---------- BUTTONS ---------- */
    if (interaction.isButton()) {
        const data = memory.get(interaction.user.id);
        if (!data) {
            return interaction.reply({ content: "❌ No active suggestions.", ephemeral: true });
        }

        const [action, indexStr] = interaction.customId.split("_");
        const index = Number(indexStr);
        const text = data[index];

        if (!text) {
            return interaction.reply({ content: "❌ Invalid option.", ephemeral: true });
        }

        if (action === "copy") {
            return interaction.reply({ content: text, ephemeral: true });
        }

        if (action === "shorter") {
            const shorter = await askAI(`Make this shorter:\n"${text}"`);
            return interaction.reply({
                content: `✂ **Shorter version**\n${shorter}`,
                ephemeral: true
            });
        }

        if (action === "rewrite") {
            const rewritten = await askAI(`Rewrite this naturally:\n"${text}"`);
            return interaction.reply({
                content: `🔁 **Rewritten**\n${rewritten}`,
                ephemeral: true
            });
        }
    }
});

/* ======================
   READY
====================== */

client.once("ready", async () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
    await registerCommands();
});

/* ======================
   KEEP-ALIVE SERVER (Render)
====================== */

const app = express();

app.get("/", (req, res) => {
    res.send("Discord bot is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Web server listening on port ${PORT}`);
});


client.login(process.env.DISCORD_TOKEN);