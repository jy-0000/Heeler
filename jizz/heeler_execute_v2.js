/**
 * Heeler Execution Engine v2
 * Enhanced ActionScript 2 compatibility with proper timeline, frame scripts, and event handling
 * Based on Flash/ActionScript 2 specifications
 */

class HeelerTimeline {
	constructor() {
		this.frames = {};
		this.frameScripts = {};
		this.frameLabels = {};
		this.currentFrame = 1;
		this.totalFrames = 1;
		this.isPlaying = false;
		this.eventHandlers = {
			'onEnterFrame': [],
			'onPress': [],
			'onRelease': [],
			'onRollOver': [],
			'onRollOut': [],
			'onDragOver': [],
			'onDragOut': []
		};
	}

	setFrameScript(frameNum, scriptFunction) {
		if (!this.frameScripts[frameNum]) {
			this.frameScripts[frameNum] = [];
		}
		this.frameScripts[frameNum].push(scriptFunction);
	}

	addEventListener(eventType, handler) {
		if (this.eventHandlers[eventType]) {
			this.eventHandlers[eventType].push(handler);
		}
	}

	removeEventListener(eventType, handler) {
		if (this.eventHandlers[eventType]) {
			const idx = this.eventHandlers[eventType].indexOf(handler);
			if (idx > -1) {
				this.eventHandlers[eventType].splice(idx, 1);
			}
		}
	}

	dispatchEvent(eventType, data = {}) {
		if (this.eventHandlers[eventType]) {
			for (const handler of this.eventHandlers[eventType]) {
				try {
					handler(data);
				} catch (e) {
					console.error(`Error in ${eventType} handler:`, e);
				}
			}
		}
	}

	executeFrameScript(frameNum) {
		if (this.frameScripts[frameNum]) {
			for (const script of this.frameScripts[frameNum]) {
				try {
					script();
				} catch (e) {
					console.error(`Error executing frame ${frameNum} script:`, e);
				}
			}
		}
	}
}

class HeelerSymbol {
	constructor(id, name, type = 'MovieClip') {
		this.id = id;
		this.name = name;
		this.type = type;
		this.timeline = new HeelerTimeline();
		this.displayList = [];
		this.properties = {
			x: 0,
			y: 0,
			scaleX: 1,
			scaleY: 1,
			rotation: 0,
			alpha: 1,
			visible: true,
			width: 0,
			height: 0
		};
	}

	addToDisplayList(obj) {
		this.displayList.push(obj);
	}

	removeFromDisplayList(depth) {
		this.displayList = this.displayList.filter(obj => obj.depth !== depth);
	}

	getDisplayList() {
		return this.displayList.sort((a, b) => a.depth - b.depth);
	}
}

class HeelerScene {
	constructor(swfData = {}) {
		this.width = swfData.frameWidth || 550;
		this.height = swfData.frameHeight || 400;
		this.FPS = swfData.frameRate || 24;
		this.frameCount = swfData.frameCount || 1;

		this.Sprites = {};
		this.Shapes = swfData.shapes || {};
		this.Symbols = {};
		this.listeners = this.initializeListeners();
		this.root = new HeelerSymbol(0, '_root', 'MainTimeline');
		this.stage = {
			width: this.width,
			height: this.height
		};

		// ActionScript 2 global variables
		this.globalVariables = {};
		this.globalFunctions = {};
	}

	initializeListeners() {
		return {
			'release': {
				condition: (boundingBoxes) => {
					const mouseState = window.__heeler?.controlState?.mouse || {};
					return mouseState.up && this.collisionRect(boundingBoxes[0], boundingBoxes[1]);
				},
				objectList: []
			},
			'press': {
				condition: (boundingBoxes) => {
					const mouseState = window.__heeler?.controlState?.mouse || {};
					return mouseState.clicking && this.collisionRect(boundingBoxes[0], boundingBoxes[1]);
				},
				objectList: []
			},
			'rollOver': {
				condition: (boundingBoxes) => {
					return this.collisionRect(boundingBoxes[0], boundingBoxes[1]);
				},
				objectList: []
			},
			'rollOut': {
				condition: (boundingBoxes) => {
					return !this.collisionRect(boundingBoxes[0], boundingBoxes[1]);
				},
				objectList: []
			},
			'dragOver': {
				condition: (boundingBoxes) => {
					const mouseState = window.__heeler?.controlState?.mouse || {};
					return mouseState.down && this.collisionRect(boundingBoxes[0], boundingBoxes[1]);
				},
				objectList: []
			},
			'dragOut': {
				condition: (boundingBoxes) => {
					const mouseState = window.__heeler?.controlState?.mouse || {};
					return mouseState.down && !this.collisionRect(boundingBoxes[0], boundingBoxes[1]);
				},
				objectList: []
			}
		};
	}

	collisionRect(rect1, rect2) {
		const overlapX = rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x;
		const overlapY = rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
		return overlapX && overlapY;
	}

	setVariable(name, value) {
		this.globalVariables[name] = value;
	}

	getVariable(name) {
		return this.globalVariables[name];
	}

	defineFunction(name, func) {
		this.globalFunctions[name] = func;
	}
}

class ActionScript2Engine {
	constructor(scene) {
		this.scene = scene;
		this.scopeStack = [scene.globalVariables];
		this.callStack = [];
		this.timelineContext = null;
		this.isExecuting = false;
	}

	createExecutionContext() {
		return {
			scene: this.scene,
			variables: this.scopeStack[this.scopeStack.length - 1],
			functions: this.scene.globalFunctions,
			
			// Timeline functions
			play: () => {
				if (this.timelineContext) {
					this.timelineContext.isPlaying = true;
				}
			},
			stop: () => {
				if (this.timelineContext) {
					this.timelineContext.isPlaying = false;
				}
			},
			gotoAndPlay: (frameNum) => {
				if (this.timelineContext) {
					this.timelineContext.currentFrame = frameNum;
					this.timelineContext.isPlaying = true;
				}
			},
			gotoAndStop: (frameNum) => {
				if (this.timelineContext) {
					this.timelineContext.currentFrame = frameNum;
					this.timelineContext.isPlaying = false;
				}
			},
			nextFrame: () => {
				if (this.timelineContext && this.timelineContext.currentFrame < this.timelineContext.totalFrames) {
					this.timelineContext.currentFrame++;
				}
			},
			prevFrame: () => {
				if (this.timelineContext && this.timelineContext.currentFrame > 1) {
					this.timelineContext.currentFrame--;
				}
			},

			// Event handlers
			trace: (...args) => {
				console.log(...args);
			},

			// Type conversion
			String: (val) => String(val),
			Number: (val) => Number(val),
			Boolean: (val) => Boolean(val),
			Array: (...items) => items,
			Object: () => ({}),

			// Math
			Math: Math,
			isNaN: isNaN,
			parseInt: parseInt,
			parseFloat: parseFloat
		};
	}

	executeScript(code, context = null) {
		const execContext = context || this.createExecutionContext();
		this.isExecuting = true;

		try {
			// Create a function that executes in the proper scope
			const scopeVars = Object.keys(execContext.variables)
				.map(k => `${k}=${JSON.stringify(execContext.variables[k])}`)
				.join(',');

			const fn = new Function(
				...Object.keys(execContext),
				`
				${scopeVars};
				${code}
				`
			);

			const result = fn(...Object.values(execContext));
			this.isExecuting = false;
			return result;
		} catch (e) {
			console.error('ActionScript execution error:', e, 'Code:', code);
			this.isExecuting = false;
			throw e;
		}
	}

	pushScope(scope = {}) {
		this.scopeStack.push(scope);
	}

	popScope() {
		if (this.scopeStack.length > 1) {
			this.scopeStack.pop();
		}
	}

	getCurrentScope() {
		return this.scopeStack[this.scopeStack.length - 1];
	}
}

// Global control state
let controlState = {
	playing: false,
	frame: 1,
	maxFrames: 7,
	mouse: {
		clicking: false,
		up: false,
		down: false,
		box: {
			width: 16,
			height: 16,
			x: 0,
			y: 0
		}
	},
	loop: true,
	lastFrameTime: 0
};

// Store global reference
window.__heeler = { controlState };

class Heeler {
	static Scene = null;
	static engine = null;
	static canvas = null;
	static ctx = null;
	static animationFrameId = null;

	static getScene() {
		return this.Scene ? Object.assign({}, this.Scene) : null;
	}

	static swapScene(incomingScene) {
		controlState.loop = false;
		this.stop();
		controlState.frame = 0;

		Object.keys(this.Scene.listeners).forEach(listenerName => {
			this.Scene.listeners[listenerName].objectList = [];
		});

		if (this.canvas) {
			this.canvas.remove();
		}

		this.Scene = incomingScene;
		const newElement = this.spawn();
		this.run();
		controlState.loop = true;
		return newElement;
	}

	static spawn() {
		const canvas = document.createElement('canvas');
		const dumpCanvas = document.createElement('canvas');

		canvas.id = 'heeler_output';
		dumpCanvas.id = 'heeler_dump';
		dumpCanvas.style.display = 'none';

		document.body.appendChild(canvas);
		document.body.appendChild(dumpCanvas);

		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');
		canvas.style.backgroundColor = 'white';

		return { element: canvas };
	}

	static run() {
		if (!this.canvas || !this.ctx) {
			setTimeout(() => this.run(), 1000);
			return;
		}

		this.canvas.width = this.Scene.width;
		this.canvas.height = this.Scene.height;

		// Initialize engine
		this.engine = new ActionScript2Engine(this.Scene);

		// Setup sprite instances from timeline
		const objectNames = Object.keys(this.Scene.Sprites);
		for (let i = 0; i < objectNames.length; i++) {
			const objectName = objectNames[i];
			const spriteData = this.Scene.Sprites[objectName];
			const sprite = new HeelerSymbol(i, objectName);

			// Process initial sprite scripts
			if (spriteData.scripts && spriteData.scripts[0]) {
				this.processAS2Script(spriteData.scripts[0], sprite, objectName);
			}

			this.Scene.Sprites[objectName] = sprite;
		}

		this.startRenderLoop();
		this.startEventLoop();
	}

	static processAS2Script(scriptText, sprite, objectName) {
		// Parse on() listeners and convert to proper event handlers
		const listeners = this.parseListeners(scriptText);
		for (const listener of listeners) {
			sprite.timeline.addEventListener(listener.type, listener.callback);
		}

		// Execute frame scripts
		const frameScripts = this.parseFrameScripts(scriptText);
		for (const script of frameScripts) {
			sprite.timeline.setFrameScript(script.frame, () => {
				this.engine.timelineContext = sprite.timeline;
				this.engine.executeScript(script.code, this.engine.createExecutionContext());
			});
		}
	}

	static parseListeners(scriptText) {
		const listeners = [];
		const onRegex = /on\s*\(\s*(press|release|rollOver|rollOut|dragOver|dragOut)\s*\)\s*\{([\s\S]*?)\}/g;
		let match;

		while ((match = onRegex.exec(scriptText)) !== null) {
			const eventType = match[1];
			const code = match[2];
			listeners.push({
				type: eventType,
				callback: () => {
					this.engine.executeScript(code);
				}
			});
		}

		return listeners;
	}

	static parseFrameScripts(scriptText) {
		const scripts = [];
		// Extract functions and declarations
		const lines = scriptText.split('\n');
		let buffer = '';

		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith('on(')) {
				buffer += line + '\n';
			}
		}

		if (buffer.trim()) {
			scripts.push({
				frame: 1,
				code: buffer
			});
		}

		return scripts;
	}

	static startEventLoop() {
		// Setup mouse tracking
		document.body.onmousemove = (e) => {
			if (!this.canvas) return;
			const rect = this.canvas.getBoundingClientRect();
			controlState.mouse.box.x = e.clientX - rect.left;
			controlState.mouse.box.y = e.clientY - rect.top;
		};

		document.body.onmousedown = () => {
			controlState.mouse.clicking = true;
			setTimeout(() => {
				if (controlState.mouse.clicking) controlState.mouse.clicking = false;
			}, 10);
			controlState.mouse.down = true;
			controlState.mouse.up = false;
		};

		document.body.onmouseup = () => {
			controlState.mouse.clicking = false;
			controlState.mouse.down = false;
			controlState.mouse.up = true;
			setTimeout(() => {
				if (!controlState.mouse.clicking) controlState.mouse.up = false;
			}, 10);
		};
	}

	static startRenderLoop() {
		const tick = () => {
			if (!controlState.loop) return;

			const now = Date.now();
			const frameTime = 1000 / this.Scene.FPS;

			if (now - controlState.lastFrameTime >= frameTime) {
				if (controlState.playing) {
					if (controlState.frame < controlState.maxFrames) {
						controlState.frame++;
					} else {
						controlState.frame = 1;
					}
				}

				// Dispatch enterFrame event
				this.Scene.root.timeline.dispatchEvent('onEnterFrame');

				// Draw
				this.render();
				controlState.lastFrameTime = now;
			}

			this.animationFrameId = requestAnimationFrame(tick);
		};

		tick();
	}

	static render() {
		if (!this.ctx) return;

		// Clear canvas
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.fillStyle = 'white';
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		// Draw sprites
		const objectNames = Object.keys(this.Scene.Sprites);
		for (const objectName of objectNames) {
			const sprite = this.Scene.Sprites[objectName];
			if (sprite.properties && sprite.properties.visible) {
				this.drawSprite(sprite);
			}
		}

		// Draw mouse cursor
		const mouseBox = controlState.mouse.box;
		this.ctx.fillStyle = 'black';
		this.ctx.fillRect(mouseBox.x, mouseBox.y, mouseBox.width, mouseBox.height);
	}

	static drawSprite(sprite) {
		const x = sprite.properties.x || 0;
		const y = sprite.properties.y || 0;
		const scaleX = sprite.properties.scaleX || 1;
		const scaleY = sprite.properties.scaleY || 1;
		const alpha = sprite.properties.alpha || 1;
		const rotation = sprite.properties.rotation || 0;

		this.ctx.save();
		this.ctx.globalAlpha = alpha;
		this.ctx.translate(x, y);
		this.ctx.scale(scaleX, scaleY);
		if (rotation !== 0) {
			this.ctx.rotate((rotation * Math.PI) / 180);
		}

		// Draw shapes in sprite
		if (sprite.displayList && sprite.displayList.length > 0) {
			for (const item of sprite.displayList) {
				this.drawDisplayListItem(item);
			}
		}

		this.ctx.restore();
	}

	static drawDisplayListItem(item) {
		if (item.type === 'rectangle') {
			this.ctx.fillStyle = item.fill || 'magenta';
			this.ctx.fillRect(item.x || 0, item.y || 0, item.width || 100, item.height || 100);
			if (item.strokeWidth && item.strokeWidth > 0) {
				this.ctx.strokeStyle = item.strokeColor || 'black';
				this.ctx.lineWidth = item.strokeWidth;
				this.ctx.strokeRect(item.x || 0, item.y || 0, item.width || 100, item.height || 100);
			}
		}
	}

	static play() {
		controlState.playing = true;
	}

	static stop() {
		controlState.playing = false;
	}

	static gotoAndPlay(frameNum) {
		controlState.frame = frameNum;
		controlState.playing = true;
	}

	static gotoAndStop(frameNum) {
		controlState.frame = frameNum;
		controlState.playing = false;
	}
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { Heeler, HeelerScene, ActionScript2Engine, HeelerSymbol, HeelerTimeline, controlState };
}
