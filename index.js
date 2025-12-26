import {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder
} from "discord.js";
import axios from "axios";
import "dotenv/config";

/* ======================
   CLIENT
====================== */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages
    ],
});

/* ======================
   COMMANDS
====================== */

const toneChoices = [
    { name: "Casual", value: "casual" },
    { name: "Polite", value: "polite" },
    { name: "Professional", value: "professional" },
    { name: "Flirty", value: "flirty" },
    { name: "Friendly", value: "friendly" }
];

const lengthChoices = [
    { name: "Short", value: "short" },
    { name: "Medium", value: "medium" },
    { name: "Long", value: "long" }
];

const commands = [
    new SlashCommandBuilder()
        .setName("suggest")
        .setDescription("Suggest reply variations")
        .addStringOption(o =>
            o.setName("message")
                .setDescription("Paste your friend's message")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("tone")
                .setDescription("Reply tone")
                .addChoices(...toneChoices)
        )
        .addStringOption(o =>
            o.setName("length")
                .setDescription("Reply length")
                .addChoices(...lengthChoices)
        ),

    new SlashCommandBuilder()
        .setName("rewrite")
        .setDescription("Rewrite your draft message")
        .addStringOption(o =>
            o.setName("text")
                .setDescription("Your draft message")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("tone")
                .setDescription("Rewrite tone")
                .addChoices(...toneChoices)
        )
        .addStringOption(o =>
            o.setName("length")
                .setDescription("Rewrite length")
                .addChoices(...lengthChoices)
        )
].map(cmd => cmd.toJSON());

/* ======================
   REGISTER
====================== */

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
    await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
    );
    console.log("Commands registered");
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
                "HTTP-Referer": "dm-reply-bot",
                "X-Title": "Auto Suggestion"
            }
        }
    );

    return res.data.choices[0].message.content.trim();
}

/* ======================
   INTERACTIONS
====================== */

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.guild) {
        return interaction.reply({
            content: "❌ DM-only bot.",
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    const tone = interaction.options.getString("tone") || "casual";
    const length = interaction.options.getString("length") || "medium";

    try {
        if (interaction.commandName === "suggest") {
            const message = interaction.options.getString("message");

            const prompt = `
You are a personal chat reply assistant.

Tone: ${tone}
Length: ${length}

Reply in the SAME language as the message.
Generate 3 different natural replies.
Do NOT add explanations.

Message:
"${message}"
`;

            const result = await askAI(prompt);

            const replies = result.split("\n").filter(Boolean).slice(0, 3);

            let output = `💡 **Suggested replies (${tone}, ${length}):**\n\n`;
            replies.forEach((r, i) => {
                output += `${i + 1}️⃣ ${r}\n`;
            });

            await interaction.editReply(output);
        }

        if (interaction.commandName === "rewrite") {
            const text = interaction.options.getString("text");

            const prompt = `
Improve the following message.

Tone: ${tone}
Length: ${length}

Keep meaning same.
Reply in same language.
Make it natural.

Text:
"${text}"
`;

            const result = await askAI(prompt);

            await interaction.editReply(
                `✨ **Improved version:**\n${result}`
            );
        }

    } catch (err) {
        console.error(err);
        await interaction.editReply("❌ Error generating response.");
    }
});

/* ======================
   READY
====================== */

async function clearCommands() {
    await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: [] }
    );
    console.log("Old commands cleared");
}


client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await clearCommands();
    await registerCommands();
});

client.login(process.env.DISCORD_TOKEN);
