const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Lightweight zero-dependency ZIP creator for packing extension/ directory
function createZip(files) {
  const localHeaders = [];
  const centralDirectories = [];
  let offset = 0;

  for (const file of files) {
    const filenameBuf = Buffer.from(file.name.replace(/\\/g, '/'), 'utf8');
    const contentBuf = file.content;
    const crc = crc32(contentBuf);
    const compressedBuf = zlib.deflateRawSync(contentBuf);

    // Local file header
    const localHeader = Buffer.alloc(30 + filenameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4);          // Version needed
    localHeader.writeUInt16LE(0, 6);           // Flags
    localHeader.writeUInt16LE(8, 8);           // Compression (8 = Deflate)
    localHeader.writeUInt16LE(0, 10);          // Mod time
    localHeader.writeUInt16LE(0, 12);          // Mod date
    localHeader.writeUInt32LE(crc, 14);        // CRC-32
    localHeader.writeUInt32LE(compressedBuf.length, 18); // Compressed size
    localHeader.writeUInt32LE(contentBuf.length, 22);    // Uncompressed size
    localHeader.writeUInt16LE(filenameBuf.length, 26);  // Filename length
    localHeader.writeUInt16LE(0, 28);          // Extra field length
    filenameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader);
    localHeaders.push(compressedBuf);

    // Central directory header
    const cdHeader = Buffer.alloc(46 + filenameBuf.length);
    cdHeader.writeUInt32LE(0x02014b50, 0); // Signature
    cdHeader.writeUInt16LE(20, 4);          // Version made by
    cdHeader.writeUInt16LE(20, 6);          // Version needed
    cdHeader.writeUInt16LE(0, 8);           // Flags
    cdHeader.writeUInt16LE(8, 10);          // Compression method
    cdHeader.writeUInt16LE(0, 12);          // Mod time
    cdHeader.writeUInt16LE(0, 14);          // Mod date
    cdHeader.writeUInt32LE(crc, 16);        // CRC-32
    cdHeader.writeUInt32LE(compressedBuf.length, 20); // Compressed size
    cdHeader.writeUInt32LE(contentBuf.length, 24);    // Uncompressed size
    cdHeader.writeUInt16LE(filenameBuf.length, 28);  // Filename length
    cdHeader.writeUInt16LE(0, 30);          // Extra field length
    cdHeader.writeUInt16LE(0, 32);          // File comment length
    cdHeader.writeUInt16LE(0, 34);          // Disk number start
    cdHeader.writeUInt16LE(0, 36);          // Internal file attributes
    cdHeader.writeUInt32LE(0, 38);          // External file attributes
    cdHeader.writeUInt32LE(offset, 42);      // Relative offset of local header
    filenameBuf.copy(cdHeader, 46);

    centralDirectories.push(cdHeader);
    offset += localHeader.length + compressedBuf.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDirectories) cdSize += cd.length;

  // End of central directory record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // Signature
  eocd.writeUInt16LE(0, 4);          // Disk number
  eocd.writeUInt16LE(0, 6);          // Disk with CD
  eocd.writeUInt16LE(files.length, 8); // Num entries on disk
  eocd.writeUInt16LE(files.length, 10); // Total entries
  eocd.writeUInt32LE(cdSize, 12);     // Size of CD
  eocd.writeUInt32LE(cdOffset, 16);   // Offset of CD
  eocd.writeUInt16LE(0, 20);          // Comment length

  return Buffer.concat([...localHeaders, ...centralDirectories, eocd]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) crc = (crc >>> 1) ^ 0xedb88320;
      else crc = crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getFilesRecursively(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath, baseDir));
    } else {
      const relativeName = path.relative(baseDir, filePath);
      // Exclude scripts folder from user zip
      if (!relativeName.startsWith('scripts')) {
        results.push({
          name: relativeName,
          content: fs.readFileSync(filePath)
        });
      }
    }
  }
  return results;
}

const extensionDir = path.join(__dirname, '..', 'extension');
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const files = getFilesRecursively(extensionDir);
const zipBuffer = createZip(files);

const zipPath = path.join(publicDir, 'leetrev-extension.zip');
fs.writeFileSync(zipPath, zipBuffer);
console.log(`Successfully generated public/leetrev-extension.zip (${zipBuffer.length} bytes, ${files.length} files)`);
