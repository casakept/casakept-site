import sharp from "sharp";

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Burns a timestamp caption into a copy of the photo itself (not just
// upload metadata) so there's no dispute later about when a checklist
// photo was actually taken -- a screenshot or a re-download of the file
// carries the same visible timestamp. Always re-encodes to JPEG so the
// output format/orientation is predictable regardless of the source.
export async function stampPhotoWithTimestamp(input: Buffer, label: string): Promise<Buffer> {
  // metadata().width/height report the RAW file's dimensions, before the
  // .rotate() below actually applies -- for a photo with EXIF orientation
  // 5-8 (90/270 degree phone rotations), the real output is width/height
  // swapped from that. Composite would then throw a dimension mismatch
  // against the un-swapped overlay, so swap here to match what .rotate()
  // will actually produce.
  const metadata = await sharp(input).metadata();
  const swapped = (metadata.orientation ?? 1) >= 5;
  const width = (swapped ? metadata.height : metadata.width) ?? 800;
  const height = (swapped ? metadata.width : metadata.height) ?? 600;

  // .rotate() with no args auto-orients from the source's EXIF Orientation
  // tag (mobile cameras write these) and strips it afterward.
  const oriented = sharp(input).rotate();

  const fontSize = Math.max(14, Math.round(width * 0.032));
  const barHeight = Math.round(fontSize * 2.2);
  const overlay = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${height - barHeight}" width="${width}" height="${barHeight}" fill="black" fill-opacity="0.55" />
      <text x="${Math.round(fontSize * 0.6)}" y="${height - barHeight / 2}" font-family="monospace"
            font-size="${fontSize}" fill="white" dominant-baseline="middle">${escapeXml(label)}</text>
    </svg>`
  );

  return oriented.composite([{ input: overlay, top: 0, left: 0 }]).jpeg({ quality: 88 }).toBuffer();
}
