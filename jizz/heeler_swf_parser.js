/**
 * Heeler SWF Parser
 * Parses Adobe Flash SWF files (versions 1-10, ActionScript 2 compatible)
 * Extracts shapes, sprites, timelines, frame scripts, and events
 * Based on official SWF File Format Specification
 */

class BitReader {
	constructor(buffer) {
		this.buffer = new Uint8Array(buffer);
		this.bytePos = 0;
		this.bitPos = 0;
	}

	readBits(numBits) {
		if (numBits === 0) return 0;
		
		let result = 0;
		for (let i = 0; i < numBits; i++) {
			const byteIndex = this.bytePos;
			const bitIndex = 7 - this.bitPos;
			
			// Return 0 for bits past end of buffer instead of throwing
			if (byteIndex >= this.buffer.length) {
				// Pad remaining bits with zeros
				result = result << (numBits - i);
				this.bytePos = this.buffer.length;
				this.bitPos = 0;
				return result;
			}
			
			const bit = (this.buffer[byteIndex] >> bitIndex) & 1;
			result = (result << 1) | bit;
			
			this.bitPos++;
			if (this.bitPos === 8) {
				this.bitPos = 0;
				this.bytePos++;
			}
		}
		
		return result;
	}

	readSignedBits(numBits) {
		const value = this.readBits(numBits);
		if (value & (1 << (numBits - 1))) {
			return value - (1 << numBits);
		}
		return value;
	}

	alignToByteStart() {
		if (this.bitPos !== 0) {
			this.bitPos = 0;
			this.bytePos++;
		}
	}

	readUI8() {
		this.alignToByteStart();
		return this.buffer[this.bytePos++];
	}

	readUI16() {
		this.alignToByteStart();
		const low = this.buffer[this.bytePos++];
		const high = this.buffer[this.bytePos++];
		return low | (high << 8);
	}

	readUI32() {
		this.alignToByteStart();
		const b0 = this.buffer[this.bytePos++];
		const b1 = this.buffer[this.bytePos++];
		const b2 = this.buffer[this.bytePos++];
		const b3 = this.buffer[this.bytePos++];
		return b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
	}

	readSI16() {
		const val = this.readUI16();
		if (val & 0x8000) return val - 0x10000;
		return val;
	}

	readSI32() {
		const val = this.readUI32();
		if (val & 0x80000000) return val - 0x100000000;
		return val;
	}

	readFloat() {
		this.alignToByteStart();
		const buf = this.buffer.slice(this.bytePos, this.bytePos + 4);
		this.bytePos += 4;
		const view = new DataView(buf.buffer);
		return view.getFloat32(0, true);
	}

	readString() {
		this.alignToByteStart();
		let str = '';
		while (this.bytePos < this.buffer.length) {
			const byte = this.buffer[this.bytePos++];
			if (byte === 0) break;
			str += String.fromCharCode(byte);
		}
		return str;
	}

	readBytes(length) {
		this.alignToByteStart();
		const bytes = this.buffer.slice(this.bytePos, this.bytePos + length);
		this.bytePos += length;
		return bytes;
	}

	remaining() {
		// Account for current bit position
		const fullBytes = this.buffer.length - this.bytePos;
		if (this.bitPos === 0) {
			return fullBytes;
		}
		// If we're mid-byte, we have (this byte + remaining bytes)
		return Math.ceil((fullBytes * 8 - (8 - this.bitPos)) / 8);
	}
}

class SWFParser {
	constructor(arrayBuffer) {
		this.buffer = arrayBuffer;
		this.data = null;
		this.shapes = {};
		this.symbols = {};
		this.timelines = {};
		this.scripts = {};
		this.frameLabels = {};
	}

	parse() {
		// Decompress if needed
		this.decompressIfNeeded();
		const reader = new BitReader(this.data);

		// Parse header
		const signature = String.fromCharCode(reader.readUI8(), reader.readUI8(), reader.readUI8());
		const version = reader.readUI8();
		const fileLength = reader.readUI32();

		if (signature !== 'FWS' && signature !== 'CWS') {
			throw new Error(`Invalid SWF signature: ${signature}`);
		}

		// Parse frame size (RECT)
		const nBits = reader.readBits(5);
		const xMin = reader.readSignedBits(nBits);
		const xMax = reader.readSignedBits(nBits);
		const yMin = reader.readSignedBits(nBits);
		const yMax = reader.readSignedBits(nBits);

		const frameWidth = (xMax - xMin) / 20; // Convert twips to pixels
		const frameHeight = (yMax - yMin) / 20;

		// Parse frame rate (16.16 fixed point)
		reader.alignToByteStart();
		const frameRate = reader.readUI16() >> 8;
		const frameCount = reader.readUI16();

		const swfData = {
			version,
			frameWidth,
			frameHeight,
			frameRate: frameRate || 24,
			frameCount,
			scenes: [],
			exports: []
		};

		// Parse tags
		const tags = this.parseTags(reader);
		this.processTags(tags, swfData);

		swfData.shapes = this.shapes;
		swfData.symbols = this.symbols;
		swfData.timelines = this.timelines;
		swfData.scripts = this.scripts;
		swfData.frameLabels = this.frameLabels;

		return swfData;
	}

	decompressIfNeeded() {
		const view = new Uint8Array(this.buffer);
		const signature = String.fromCharCode(view[0], view[1], view[2]);

		if (signature === 'FWS') {
			// Uncompressed
			this.data = view;
		} else if (signature === 'CWS') {
			// ZLIB compressed
			if (typeof pako === 'undefined') {
				throw new Error('Compression not supported. Include pako library for CWS decompression.');
			}
			try {
				// Skip first 8 bytes (signature + version + file length)
				const compressedData = view.slice(8);
				const decompressed = pako.inflate(compressedData);
				
				// Reconstruct the full SWF data with header
				const reconstructed = new Uint8Array(8 + decompressed.length);
				reconstructed.set(view.slice(0, 8), 0); // Copy header
				reconstructed.set(decompressed, 8); // Add decompressed data
				
				// Update file length in header (little-endian at bytes 4-7)
				const newLength = 8 + decompressed.length;
				reconstructed[4] = newLength & 0xFF;
				reconstructed[5] = (newLength >> 8) & 0xFF;
				reconstructed[6] = (newLength >> 16) & 0xFF;
				reconstructed[7] = (newLength >> 24) & 0xFF;
				
				this.data = reconstructed;
			} catch (e) {
				throw new Error(`Decompression failed: ${e.message}`);
			}
		} else {
			throw new Error('Invalid SWF signature');
		}
	}

	parseTags(reader) {
		const tags = [];
		while (reader.remaining() > 0) {
			reader.alignToByteStart();
			const tagTypeAndLength = reader.readUI16();
			const tagType = tagTypeAndLength >> 6;
			let tagLength = tagTypeAndLength & 0x3F;

			if (tagLength === 0x3F) {
				tagLength = reader.readUI32();
			}

			const tagData = reader.readBytes(tagLength);
			tags.push({ type: tagType, data: tagData, length: tagLength });
		}
		return tags;
	}

	processTags(tags, swfData) {
		const tagHandlers = {
			1: this.parseShowFrame.bind(this),
			2: this.parseShapeWithStyle.bind(this),
			4: this.parsePlaceObject.bind(this),
			5: this.parseRemoveObject.bind(this),
			6: this.parseDefineBitsJPEG.bind(this),
			9: this.parseSetBackgroundColor.bind(this),
			10: this.parseDefineFont.bind(this),
			11: this.parseDefineText.bind(this),
			13: this.parseDoAction.bind(this),
			14: this.parseDefineSoundStartSound.bind(this),
			15: this.parseStartSound.bind(this),
			17: this.parseDefineButtonSound.bind(this),
			18: this.parseSoundStreamHead.bind(this),
			19: this.parseSoundStreamBlock.bind(this),
			20: this.parseDefineMorphShape.bind(this),
			22: this.parseDefineShape2.bind(this),
			23: this.parseDefineButtonCxform.bind(this),
			24: this.parseProtect.bind(this),
			26: this.parsePlaceObject2.bind(this),
			28: this.parseRemoveObject2.bind(this),
			32: this.parseDefineShape3.bind(this),
			33: this.parseDefineText2.bind(this),
			34: this.parseDefineButton2.bind(this),
			35: this.parseDefineBitsJPEG2.bind(this),
			36: this.parseDefineBitsJPEG3.bind(this),
			37: this.parseDefineBitsLossless.bind(this),
			38: this.parseDefineBitsLossless2.bind(this),
			39: this.parseDefineEditText.bind(this),
			43: this.parseFrameLabel.bind(this),
			45: this.parseSoundStreamHead2.bind(this),
			46: this.parseDefineMorphShape2.bind(this),
			48: this.parseDefineFont2.bind(this),
			56: this.parseExportAssets.bind(this),
			59: this.parseDoInitAction.bind(this),
			60: this.parseVideoStream.bind(this),
			61: this.parseVideoFrame.bind(this),
			62: this.parseDefineFontInfo2.bind(this),
			63: this.parseDebugID.bind(this),
			64: this.parseEnableDebugger2.bind(this),
			65: this.parseScriptLimits.bind(this),
			66: this.parseSetTabIndex.bind(this),
			69: this.parseFileAttributes.bind(this),
			70: this.parsePlaceObject3.bind(this),
			71: this.parseImportAssets2.bind(this),
			73: this.parseDefineFontAlignZones.bind(this),
			74: this.parseCryptoCrypto.bind(this),
			75: this.parseAssertFilter.bind(this),
			76: this.parseCSMTextSettings.bind(this),
			77: this.parseDefineFont3.bind(this),
			78: this.parseSymbolClass.bind(this),
			82: this.parseDoABC.bind(this),
			83: this.parseDefineShape4.bind(this),
			84: this.parseDefineMorphShape3.bind(this),
			86: this.parseDefineSceneAndFrameLabelData.bind(this),
			87: this.parseDefineBinaryData.bind(this),
			90: this.parseDefineFont4.bind(this)
		};

		for (const tag of tags) {
			const handler = tagHandlers[tag.type];
			if (handler) {
				try {
					handler(tag.data);
				} catch (e) {
					console.warn(`Error processing tag ${tag.type}:`, e);
				}
			}
		}
	}

	// Tag handlers
	parseShowFrame(data) {
		// ShowFrame marks the end of a frame
	}

	parseShapeWithStyle(data) {
		const reader = new BitReader(data);
		const shapeId = reader.readUI16();
		this.parseShape(reader, shapeId);
	}

	parseDefineShape2(data) {
		const reader = new BitReader(data);
		const shapeId = reader.readUI16();
		this.parseShape(reader, shapeId);
	}

	parseDefineShape3(data) {
		const reader = new BitReader(data);
		const shapeId = reader.readUI16();
		this.parseShape(reader, shapeId);
	}

	parseDefineShape4(data) {
		const reader = new BitReader(data);
		const shapeId = reader.readUI16();
		this.parseShape(reader, shapeId);
	}

	parseShape(reader, shapeId) {
		// Parse bounds
		const nBits = reader.readBits(5);
		const bounds = {
			xMin: reader.readSignedBits(nBits) / 20,
			xMax: reader.readSignedBits(nBits) / 20,
			yMin: reader.readSignedBits(nBits) / 20,
			yMax: reader.readSignedBits(nBits) / 20
		};

		const shape = {
			id: shapeId,
			bounds,
			records: []
		};

		reader.alignToByteStart();
		// Parse fill bits
		const fillBits = reader.readBits(4);
		const lineBits = reader.readBits(4);

		// Parse shape records
		let shapeEnd = false;
		while (!shapeEnd) {
			const typeFlag = reader.readBits(1);
			if (typeFlag === 0) {
				// End or style record
				const level = reader.readBits(3);
				if (level === 0) {
					shapeEnd = true;
				}
			} else {
				// Draw record
				const straight = reader.readBits(1);
				const numBits = reader.readBits(4);
				if (straight) {
					const deltaX = reader.readSignedBits(numBits) / 20;
					const deltaY = reader.readSignedBits(numBits) / 20;
					shape.records.push({ type: 'line', deltaX, deltaY });
				} else {
					const controlDeltaX = reader.readSignedBits(numBits) / 20;
					const controlDeltaY = reader.readSignedBits(numBits) / 20;
					const anchorDeltaX = reader.readSignedBits(numBits) / 20;
					const anchorDeltaY = reader.readSignedBits(numBits) / 20;
					shape.records.push({
						type: 'curve',
						controlDeltaX,
						controlDeltaY,
						anchorDeltaX,
						anchorDeltaY
					});
				}
			}
		}

		this.shapes[shapeId] = shape;
	}

	parsePlaceObject(data) {
		const reader = new BitReader(data);
		const characterId = reader.readUI16();
		const depth = reader.readUI16();
		
		const obj = {
			characterId,
			depth,
			hasMatrix: reader.remaining() > 0
		};

		this.recordTimelineItem(obj);
	}

	parsePlaceObject2(data) {
		const reader = new BitReader(data);
		const hasClipActions = reader.readBits(1);
		const hasClipDepth = reader.readBits(1);
		const hasName = reader.readBits(1);
		const hasRatio = reader.readBits(1);
		const hasColorTransform = reader.readBits(1);
		const hasMatrix = reader.readBits(1);
		const hasCharacter = reader.readBits(1);
		const isMoving = reader.readBits(1);

		reader.alignToByteStart();
		
		// Check if we have enough data for depth
		if (reader.remaining() < 2) {
			console.warn('PlaceObject2: insufficient data for depth');
			return;
		}
		
		const depth = reader.readUI16();
		
		const obj = {
			depth,
			hasCharacter,
			hasMatrix,
			hasName,
			hasRatio,
			hasColorTransform,
			hasClipDepth,
			hasClipActions
		};

		try {
			if (hasCharacter && reader.remaining() >= 2) {
				obj.characterId = reader.readUI16();
			}
			if (hasMatrix && reader.remaining() > 0) {
				obj.matrix = this.readMatrix(reader);
			}
			if (hasColorTransform && reader.remaining() > 0) {
				obj.colorTransform = this.readColorTransform(reader);
			}
			if (hasRatio && reader.remaining() >= 2) {
				obj.ratio = reader.readUI16();
			}
			if (hasName && reader.remaining() > 0) {
				obj.name = reader.readString();
			}
			if (hasClipDepth && reader.remaining() >= 2) {
				obj.clipDepth = reader.readUI16();
			}
			if (hasClipActions && reader.remaining() > 0) {
				this.parseClipActions(reader, obj);
			}
		} catch (e) {
			// Silently ignore errors reading optional fields
			console.warn('PlaceObject2: error reading optional fields:', e.message);
		}

		this.recordTimelineItem(obj);
	}

	parsePlaceObject3(data) {
		this.parsePlaceObject2(data); // Similar structure
	}

	parseRemoveObject(data) {
		const reader = new BitReader(data);
		const characterId = reader.readUI16();
		const depth = reader.readUI16();
		
		this.recordTimelineItem({ type: 'remove', depth });
	}

	parseRemoveObject2(data) {
		const reader = new BitReader(data);
		const depth = reader.readUI16();
		
		this.recordTimelineItem({ type: 'remove', depth });
	}

	parseDoAction(data) {
		const reader = new BitReader(data);
		const actions = this.parseActions(reader);
		this.recordScript(actions, 'frame');
	}

	parseDoInitAction(data) {
		const reader = new BitReader(data);
		const spriteId = reader.readUI16();
		const actions = this.parseActions(reader);
		this.recordScript(actions, 'init', spriteId);
	}

	parseActions(reader) {
		const actions = [];
		reader.alignToByteStart();
		
		while (reader.remaining() > 0) {
			const actionCode = reader.readUI8();
			if (actionCode === 0) break;
			
			let actionLength = 0;
			if (actionCode & 0x80) {
				actionLength = reader.readUI16();
			}
			
			const actionData = actionLength > 0 ? reader.readBytes(actionLength) : new Uint8Array();
			actions.push({
				code: actionCode,
				data: actionData
			});
		}
		
		return actions;
	}

	parseFrameLabel(data) {
		const reader = new BitReader(data);
		const name = reader.readString();
		
		if (!this.frameLabels[name]) {
			this.frameLabels[name] = [];
		}
		this.frameLabels[name].push({ type: 'label' });
	}

	parseExportAssets(data) {
		const reader = new BitReader(data);
		const count = reader.readUI16();
		
		for (let i = 0; i < count; i++) {
			const id = reader.readUI16();
			const name = reader.readString();
		}
	}

	parseSymbolClass(data) {
		const reader = new BitReader(data);
		const count = reader.readUI16();
		
		for (let i = 0; i < count; i++) {
			const id = reader.readUI16();
			const className = reader.readString();
			this.symbols[className] = id;
		}
	}

	parseDefineButtonCxform(data) { }
	parseDefineBitsJPEG(data) { }
	parseDefineBitsJPEG2(data) { }
	parseDefineBitsJPEG3(data) { }
	parseDefineBitsLossless(data) { }
	parseDefineBitsLossless2(data) { }
	parseSetBackgroundColor(data) { }
	parseDefineFont(data) { }
	parseDefineFont2(data) { }
	parseDefineFont3(data) { }
	parseDefineFont4(data) { }
	parseDefineFontInfo2(data) { }
	parseDefineFontAlignZones(data) { }
	parseDefineText(data) { }
	parseDefineText2(data) { }
	parseDefineButton2(data) { }
	parseDefineSoundStartSound(data) { }
	parseStartSound(data) { }
	parseDefineButtonSound(data) { }
	parseSoundStreamHead(data) { }
	parseSoundStreamHead2(data) { }
	parseSoundStreamBlock(data) { }
	parseDefineMorphShape(data) { }
	parseDefineMorphShape2(data) { }
	parseDefineMorphShape3(data) { }
	parseVideoStream(data) { }
	parseVideoFrame(data) { }
	parseProtect(data) { }
	parseDebugID(data) { }
	parseEnableDebugger2(data) { }
	parseScriptLimits(data) { }
	parseSetTabIndex(data) { }
	parseFileAttributes(data) { }
	parseImportAssets2(data) { }
	parseCryptoCrypto(data) { }
	parseAssertFilter(data) { }
	parseCSMTextSettings(data) { }
	parseDoABC(data) { }
	parseDefineSceneAndFrameLabelData(data) { }
	parseDefineBinaryData(data) { }
	parseEditText(data) { }
	parseDefineEditText(data) { }

	readMatrix(reader) {
		try {
			// Check minimum data available for nBits (5 bits = at least 1 byte)
			if (reader.remaining() < 1) {
				console.warn('readMatrix: insufficient data for matrix header');
				return {
					scaleX: 1, scaleY: 1,
					rotateSkew0: 0, rotateSkew1: 0,
					translateX: 0, translateY: 0
				};
			}
			
			const nBits = reader.readBits(5);
			
			// Each field needs nBits bits
			// Estimate bytes needed: (5 + nBits*6) bits / 8 = rough estimate
			const bitsNeeded = nBits * 6;
			const bytesNeeded = Math.ceil((5 + bitsNeeded) / 8);
			
			if (reader.remaining() < bytesNeeded) {
				console.warn(`readMatrix: insufficient data for matrix values (has ${reader.remaining()}, needs ~${bytesNeeded})`);
				return {
					scaleX: 1, scaleY: 1,
					rotateSkew0: 0, rotateSkew1: 0,
					translateX: 0, translateY: 0
				};
			}
			
			const scaleX = nBits > 0 ? reader.readBits(nBits) / 65536 : 1;
			const scaleY = nBits > 0 ? reader.readBits(nBits) / 65536 : 1;
			const rotateSkew0 = nBits > 0 ? reader.readBits(nBits) / 65536 : 0;
			const rotateSkew1 = nBits > 0 ? reader.readBits(nBits) / 65536 : 0;
			const translateX = nBits > 0 ? reader.readSignedBits(nBits) / 20 : 0;
			const translateY = nBits > 0 ? reader.readSignedBits(nBits) / 20 : 0;
			
			return {
				scaleX: scaleX || 1,
				scaleY: scaleY || 1,
				rotateSkew0: rotateSkew0 || 0,
				rotateSkew1: rotateSkew1 || 0,
				translateX: translateX || 0,
				translateY: translateY || 0
			};
		} catch (e) {
			console.warn('readMatrix: error parsing matrix:', e.message);
			return {
				scaleX: 1, scaleY: 1,
				rotateSkew0: 0, rotateSkew1: 0,
				translateX: 0, translateY: 0
			};
		}
	}

	readColorTransform(reader) {
		try {
			// Check minimum data for header (3 bits minimum)
			if (reader.remaining() < 1) {
				console.warn('readColorTransform: insufficient data');
				return {};
			}
			
			const hasAdd = reader.readBits(1);
			const hasMultiply = reader.readBits(1);
			const nBits = reader.readBits(4);
			
			// Estimate bytes needed
			const bitsNeeded = (hasAdd ? nBits : 0) + (hasMultiply ? nBits : 0) + (nBits * 4);
			const bytesNeeded = Math.ceil(bitsNeeded / 8);
			
			if (reader.remaining() < bytesNeeded) {
				console.warn('readColorTransform: insufficient data for color values');
				return {};
			}
			
			const result = {};
			if (hasMultiply) {
				result.multiplyRed = reader.readBits(nBits) || 255;
				result.multiplyGreen = reader.readBits(nBits) || 255;
				result.multiplyBlue = reader.readBits(nBits) || 255;
				result.multiplyAlpha = reader.readBits(nBits) || 255;
			}
			if (hasAdd) {
				result.addRed = reader.readSignedBits(nBits) || 0;
				result.addGreen = reader.readSignedBits(nBits) || 0;
				result.addBlue = reader.readSignedBits(nBits) || 0;
				result.addAlpha = reader.readSignedBits(nBits) || 0;
			}
			
			return result;
		} catch (e) {
			console.warn('readColorTransform: error parsing transform:', e.message);
			return {};
		}
	}

	parseClipActions(reader, obj) {
		const reserved = reader.readUI16();
		const allEventFlags = reader.readUI32();
		
		obj.clipActions = [];
		let hasMoreActions = true;
		
		while (hasMoreActions) {
			const eventFlags = reader.readUI32();
			if (eventFlags === 0) {
				hasMoreActions = false;
				break;
			}
			
			const actionLength = reader.readUI32();
			const actions = this.parseActions(new BitReader(reader.readBytes(actionLength)));
			
			obj.clipActions.push({
				eventFlags,
				actions
			});
		}
	}

	recordTimelineItem(obj) {
		if (!this.timelines['main']) {
			this.timelines['main'] = [];
		}
		this.timelines['main'].push(obj);
	}

	recordScript(actions, type, spriteId = null) {
		const key = spriteId ? `sprite_${spriteId}` : 'frame';
		if (!this.scripts[key]) {
			this.scripts[key] = [];
		}
		this.scripts[key].push({
			type,
			actions
		});
	}
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { BitReader, SWFParser };
}
