/**
 * DEV-ONLY SEED SCRIPT — DO NOT RUN AGAINST PRODUCTION.
 *
 * Populates the local SQLite database with fixture assets so the UI has
 * something to render during development. These rows are NOT real user
 * uploads. Per CLAUDE.md POSISI LEGAL #1, the platform itself must never
 * put content into the public library — this script exists purely as a
 * local dev convenience and must never be pointed at a production
 * DATABASE_URL or deployed environment.
 */
import { AssetType, PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { storage } from "../lib/storage";
import { VIDEO_PLACEHOLDER_THUMBNAIL_URL } from "../lib/thumbnail";
import { hashIp } from "../lib/ip-hash";
import {
  CURRENT_TOS_VERSION,
  OWNERSHIP_DECLARATION_TEXT,
  TOS_DECLARATION_TEXT,
} from "../lib/declaration";

if (process.env.NODE_ENV === "production") {
  throw new Error(
    "Refusing to run the dev seed script in a production environment.",
  );
}

const prisma = new PrismaClient();

const DEV_WALLET = "0xDEV00000000000000000000000000000000SEED";
const TAG_NAMES = ["funny", "cat", "reaction", "wojak", "gaming", "wholesome"];

const TITLES = [
  "certified bruh moment",
  "cat stares into your soul",
  "when the code compiles first try",
  "monday morning energy",
  "npc dialogue but its real life",
  "vibe check failed",
  "this is fine (it is not fine)",
  "galaxy brain take",
  "the boys reaction pack",
  "loading... please clown",
];

async function placeholderBuffer(type: AssetType, index: number): Promise<Buffer> {
  if (type === "IMAGE") {
    const hue = (index * 37) % 255;
    return sharp({
      create: {
        width: 320,
        height: 320,
        channels: 3,
        background: { r: hue, g: 120, b: 255 - hue },
      },
    })
      .png()
      .toBuffer();
  }
  // No real audio/video fixtures — just enough bytes to exercise storage.
  return Buffer.from(
    `MEMEVAULT DEV SEED PLACEHOLDER #${index} — not real media, dev only.`,
  );
}

async function main() {
  // Reset previous dev seed data so this script is safe to re-run.
  // Note: this does not delete the underlying files left in /storage from
  // earlier runs — acceptable for local fixture data, not worth the extra
  // complexity here.
  await prisma.uploadDeclaration.deleteMany({ where: { uploaderWallet: DEV_WALLET } });
  await prisma.asset.deleteMany({ where: { uploaderWallet: DEV_WALLET } });

  const uploader = await prisma.user.upsert({
    where: { walletAddress: DEV_WALLET },
    update: {},
    create: { walletAddress: DEV_WALLET, role: "VISITOR_CREATOR" },
  });

  const tags = await Promise.all(
    TAG_NAMES.map((name) =>
      prisma.tag.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );

  const types: AssetType[] = ["IMAGE", "VIDEO", "SOUND"];

  for (let i = 0; i < 10; i++) {
    const type = types[i % types.length];
    const buffer = await placeholderBuffer(type, i);
    const extension = type === "IMAGE" ? "png" : type === "VIDEO" ? "mp4" : "mp3";
    const mimeType =
      type === "IMAGE" ? "image/png" : type === "VIDEO" ? "video/mp4" : "audio/mpeg";

    const saved = await storage.save({
      buffer,
      originalName: `seed-${i}.${extension}`,
      mimeType,
    });

    let thumbnailUrl: string | null = null;
    if (type === "IMAGE") {
      const thumbBuffer = await sharp(buffer)
        .resize(160, 160)
        .webp({ quality: 80 })
        .toBuffer();
      const savedThumb = await storage.save({
        buffer: thumbBuffer,
        originalName: `seed-${i}-thumb.webp`,
        mimeType: "image/webp",
        folder: "thumbnails",
      });
      thumbnailUrl = savedThumb.key;
    } else if (type === "VIDEO") {
      thumbnailUrl = VIDEO_PLACEHOLDER_THUMBNAIL_URL;
    }

    const tagA = tags[i % tags.length];
    const tagB = tags[(i + 1) % tags.length];

    const asset = await prisma.asset.create({
      data: {
        title: TITLES[i],
        description: `dev seed fixture asset #${i + 1} — placeholder content for local development only.`,
        type,
        fileUrl: saved.key,
        thumbnailUrl,
        fileSize: saved.size,
        duration: type === "IMAGE" ? null : 30 + i,
        isOriginal: i % 4 === 0,
        uploaderWallet: uploader.walletAddress,
        tags: { connect: [{ id: tagA.id }, { id: tagB.id }] },
      },
    });

    await prisma.uploadDeclaration.create({
      data: {
        assetId: asset.id,
        uploaderWallet: uploader.walletAddress,
        declarationText: `${OWNERSHIP_DECLARATION_TEXT}\n\n${TOS_DECLARATION_TEXT}`,
        tosVersion: CURRENT_TOS_VERSION,
        ipHash: hashIp("127.0.0.1"),
      },
    });
  }

  console.log(`Seeded 10 dev-only assets for wallet ${DEV_WALLET}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
