//      prototype
let controlState = {
	playing:false,
	frame:1,
	maxFrames:7,
	mouse:{
		clicking:false,
		up:false,
		down:false,
		box:{
		    width:16,height:16,
			x:0,y:0
		}
	},
	loop:true
};
Heeler.getScene = () => {return Object.assign({},Scene);};
Heeler.swapScene = (incomingScene) => {
	controlState.loop = false;
	stop();
	controlState.frame = 0;
	
	//Scene.listeners[name].objectList
	Object.keys(Scene.listeners).forEach(listenerName => {
		Scene.listeners[listenerName].objectList = [];
	});
	
	if(heelerExists()){ heeler_output.remove(); heeler_dump.remove(); }; 
	Scene = incomingScene; 
	let newElement = Heeler.spawn();
	Heeler.run();
	
	controlState.loop = true;
	return newElement;
};
let heelerExists = () => {return typeof heeler_output !== 'undefined' && typeof ctx !== 'undefined';};
let canvasMargins = {x:0,y:0};


let adjustMargin = () => {if(heelerExists())canvasMargins = heeler_output.getBoundingClientRect();};
adjustMargin();

setInterval(adjustMargin,2000);
window.addEventListener("scroll", (event) => {
	adjustMargin();
});


document.body.onmousemove = (e) => {controlState.mouse.box.x=e.clientX-canvasMargins.x; controlState.mouse.box.y=e.clientY-canvasMargins.y;}
document.body.onmousedown = () => {
	controlState.mouse.clicking=true; setTimeout(() => {if(controlState.mouse.clicking)controlState.mouse.clicking=false;},10);
	controlState.mouse.down=true; controlState.mouse.up=false;
	}
document.body.onmouseup = () => {
	controlState.mouse.clicking=false; controlState.mouse.down=false; controlState.mouse.up=true;
	setTimeout(() => {if(!controlState.mouse.clicking)controlState.mouse.up=false;},10);
};

let drawTypes = {
	"rectangle": (newVector) => {
		ctx.strokeStyle = newVector.strokeColor || "black";
		ctx.strokeWidth = newVector.strokeWidth || 0;
		ctx.fillStyle = newVector.fill || "magenta";
		
		ctx.fillRect(newVector.x,newVector.y,newVector.width,newVector.height);
		
		if(newVector.strokeWidth > 0)ctx.strokeRect(newVector.x,newVector.y,newVector.width,newVector.height);
	}
};
let callEnds = [";",") {","){","}"];
let varSwaps = {
	//'stage.frameRate':'Scene.FPS'
};
let formatEndings = ["} \n","}\n"];
let endToken = "<|end|>";
let scriptTypes = {
	"on":{
	    type:"listener",
		expected:{
			next:"(",
			end:")",
			encasing:["{","}"]
		},
		replacement:{type:"function"}
	},
	"if":{
	    type:"listener",
		expected:{
			next:"(",
			end:")",
			encasing:["{","}"]
		},
		replacement:{type:"none"}
	},
	"function":{
	    type:"listener",
		expected:{
			next:"(",
			end:")",
			encasing:["{","}"]
		},
		replacement:{type:"none"}
	},
};
let Shapegen = {
	"polygon":(vector,fill,stroke, ...instructions) => {
		ctx.fillStyle = fill;
		ctx.strokeStyle = stroke;
		
		ctx.moveTo(vector.x,vector.y);
		for(let i=0;i<instructions.length;i++){
			let currentInstruct = instructions[i];
			ctx.lineTo(currentInstruct.x,currentInstruct.y);
		}
		ctx.lineTo(vector.x,vector.y);
		
		ctx.stroke();
		ctx.fill();
	}
};
Scene.listeners = {
	"release":{condition:(boundingBoxes)=>{ return controlState.mouse.up && collisionRect(boundingBoxes[0],boundingBoxes[1]); }},
	"press":{condition:(boundingBoxes)=>{ return controlState.mouse.clicking && collisionRect(boundingBoxes[0],boundingBoxes[1]); }},
	"rollOver":{condition:(boundingBoxes)=>{ return collisionRect(boundingBoxes[0],boundingBoxes[1]); }},
	//"rollOut":{},
	//"dragOver":{},
	//"dragOut":{}
}
	
function trace(txt){
    //more stuff here later
	console.log(txt);
}
function play(){
	if(!controlState.playing){
		
	controlState.playing=true;
	let frameLoop = () => {
		if(controlState.frame < controlState.maxFrames)controlState.frame++;
		else controlState.frame = 1;
		
		if(controlState.playing)setTimeout(frameLoop,1000/Scene.FPS);
	};
	frameLoop();
	
	}
}
function stop(){
	controlState.playing=false;
}
function gotoAndPlay(frameIndex){
	controlState.frame=frameIndex;
}
function on_release(effect, referenceName) {
	if(Scene.listeners["release"].objectList == undefined) Scene.listeners.release.objectList = [];
	Scene.listeners.release.objectList.push({name: referenceName, effect: effect});
}

function on_press(effect, referenceName) {
	if(Scene.listeners["press"].objectList == undefined) Scene.listeners.press.objectList = [];
	Scene.listeners.press.objectList.push({name: referenceName, effect: effect});
}

function on_rollOver(effect, referenceName) {
	if(Scene.listeners["rollOver"].objectList == undefined) Scene.listeners.rollOver.objectList = [];
	Scene.listeners.rollOver.objectList.push({name: referenceName, effect: effect});
}

function on_rollOut(effect, referenceName) {
	if(Scene.listeners["rollOut"].objectList == undefined) Scene.listeners.rollOut.objectList = [];
	Scene.listeners.rollOut.objectList.push({name: referenceName, effect: effect});
}

function on_dragOver(effect, referenceName) {
	if(Scene.listeners["dragOver"].objectList == undefined) Scene.listeners.dragOver.objectList = [];
	Scene.listeners.dragOver.objectList.push({name: referenceName, effect: effect});
}

function on_dragOut(effect, referenceName) {
	if(Scene.listeners["dragOut"].objectList == undefined) Scene.listeners.dragOut.objectList = [];
	Scene.listeners.dragOut.objectList.push({name: referenceName, effect: effect});
}
function collisionRect(rect1,rect2){
	let overlapX = rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x;
	let overlapY = rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
	return overlapX && overlapY;
}
function appendTokens(inputScript,victims,victimReplacement,fullReplace=false) {
	inputScript = inputScript.replaceAll("\t", "");
    
	let result = "";
	let inQuote = false;
	let quoteChar = null;
	let i = 0;
    
	while (i < inputScript.length) {
		let char = inputScript[i];
        
		if ((char === '"' || char === "'" || char === "`") && (i === 0 || inputScript[i - 1] !== "\\")) {
			if (!inQuote) {
				inQuote = true;
				quoteChar = char;
			} else if (char === quoteChar) {
				inQuote = false;
				quoteChar = null;
			}
			result += char;
			i++;
			continue;
		}
        
		if (inQuote) {
			result += char;
			i++;
			continue;
		}
        
		let matched = false;
		for (let currentVictim of victims) {
			if (inputScript.substring(i, i + currentVictim.length) === currentVictim) {
				if(!fullReplace)result += currentVictim + victimReplacement;
				else result += victimReplacement;
				i += currentVictim.length;
				matched = true;
				break;
			}
		}
        
		if (!matched) {
			result += char;
			i++;
		}
	}
    
	return result;
}
	
let controlTicks = 0;
let listenerNames = Object.keys(Scene.listeners);
Scene.loop = () => {
	if(!heelerExists()){setTimeout(Scene.loop,1000);}
	else{
		
		
	ctx.clearRect(0,0,heeler_output.width,heeler_output.height);
	let objectNames = Object.keys(Scene.Sprites);
		
	let mouseBox = controlState.mouse.box;
	for(let i=0;i<objectNames.length;i++){
		let objectName = objectNames[i];
		let currentObject = Scene.Sprites[objectName];
		
		let currentShapes = currentObject.spriteLayer.map(r => {return Scene.Shapes[r];});
			
		let currentObjectBox = {
			x:currentObject.vector.x-currentObject.vector.width/2,y:currentObject.vector.y-currentObject.vector.height/2,
			width:currentObject.vector.width,height:currentObject.vector.height
			};
		for(let i=0;i<listenerNames.length;i++){
			let currentListenerName = listenerNames[i];
			(Scene.listeners[currentListenerName].objectList || []).forEach(listenerObject => {
				if(listenerObject.name == objectName){
					
					if(
						Scene.listeners[currentListenerName].condition([mouseBox,currentObjectBox]) || false
					){
						listenerObject.effect();
					}
				}
			});
		}
		currentShapes.forEach(currentObjectShape => {
			let currentFrame = currentObjectShape.frames[controlState.frame-1] || currentObjectShape.vector;
			let currentShapeVector = currentObjectShape.vector;
			let newVector = {
				width:currentFrame.width || currentShapeVector.width,
				height:currentFrame.height || currentShapeVector.height,
				fill:currentFrame.fill,
				x:(currentObject.vector.x - currentFrame.width/2)+(currentFrame.x || 0),
				y:(currentObject.vector.y - currentFrame.height/2)+(currentFrame.y || 0),
				strokeWidth:currentShapeVector.strokeWidth || 0,
				strokeColor:currentShapeVector.strokeColor || 'black'
			};
			//console.log(newVector);
			drawTypes[currentObjectShape.type[0]](newVector);
		});
		
	}
	//if(controlState.mouse.up)alert(1);
	
	drawTypes["rectangle"]({x:mouseBox.x,y:mouseBox.y,width:mouseBox.width,height:mouseBox.height,fill:'black'});
	//controlstatelog.innerText = JSON.stringify(controlState.mouse);
	if(controlState.loop)setTimeout(Scene.loop,10);
	
	
	}
}
	
Heeler.run = () => {
	if(!heelerExists()){setTimeout(Heeler.run,1000);}
	else{
		
		
		heeler_output.width=Scene.width;
		heeler_output.height=Scene.height;
			
		 
		let objectNames = Object.keys(Scene.Sprites);
		let listeners = {};
		let typeList = Object.keys(scriptTypes);
			
		for(let i=0;i<objectNames.length;i++){
			let objectName = objectNames[i];
			let currentObject = Scene.Sprites[objectName];
			currentObject.scripts = currentObject.scripts.slice(0,1);
			let calls = appendTokens(currentObject.scripts[0],callEnds,endToken).split(endToken);
			let result = ``;
				
			let inString = false;
			let containerLevels = {};
				
			let lastDepth = 0;
			let bracketDepth = 0;
			calls.forEach(callSegment => {
				let resultingSegment = appendTokens(callSegment,['}\n','} \n'],'}; \n',true);
				Object.keys(varSwaps).forEach(swapTarget => {
					if(resultingSegment.includes(swapTarget)){
						resultingSegment = appendTokens(callSegment,[swapTarget],varSwaps[swapTarget],true);
					}
				});
				//console.log(resultingSegment);
				let segmentHadListener = false;
    	        
				typeList.forEach(typeName => {
					let fullType = scriptTypes[typeName];
					let nextExpected = fullType.expected.next;
					let endExpected = fullType.expected.end;
        
						
					let isRealCode = true;
					let inQuote = false;
					let quoteChar = null;
					let codeOnlySegment = "";
        
						
					for(let i = 0; i < resultingSegment.length; i++) {
						let char = resultingSegment[i];
            
						if ((char === '"' || char === "'" || char === "`") && (i === 0 || resultingSegment[i - 1] !== "\\")) {
							if (!inQuote) {
								inQuote = true;
								quoteChar = char;
							} else if (char === quoteChar) {
								inQuote = false;
								quoteChar = null;
							}
						}
            
						
						codeOnlySegment += inQuote ? " " : char;
					}
					
					let codeOnlyTokens = codeOnlySegment.replaceAll('\n','').replaceAll('){',') {').split(' ').filter(item => {return item.length > 0;});
					//console.log(codeOnlyTokens);
					let typePresent = codeOnlySegment.includes(" "+typeName+" ") ? true : codeOnlySegment.includes(typeName+" ") || codeOnlySegment.includes(typeName+nextExpected);

					let nextExpectedIndex = codeOnlyTokens[codeOnlyTokens.indexOf(typeName)+2] || "";
					let nextExpectedPresent = (
						codeOnlySegment.includes(" "+nextExpected) 
						|| (codeOnlySegment !== '' && nextExpectedIndex.startsWith(nextExpected)) 
					);	
					
					let isBegin = (typePresent && nextExpectedPresent) 
					|| 
					(codeOnlySegment.includes(typeName+nextExpected));
                   
					let isEnd = (codeOnlySegment.includes(endExpected+" ") && codeOnlySegment.includes(" "+fullType.expected.encasing[0]))
					|| 
					(codeOnlySegment.includes(endExpected+fullType.expected.encasing[0]));
                    
					let isType = isBegin && isEnd;
        
					if(isType){
						if(fullType.type == "listener"){
							let listenerType = codeOnlySegment.substring(codeOnlySegment.indexOf(nextExpected)+1,codeOnlySegment.indexOf(endExpected));
							containerLevels[typeName+"_"+listenerType]={depth:bracketDepth,complete:false,encasing:fullType.expected.encasing,replacementType:fullType.replacement.type};
							if(fullType.replacement.type == "function"){
								if(!Object.keys(Scene.listeners).includes(listenerType)){console.error('Invalid listener "'+listenerType+'" inside on() statement: on('+listenerType+')');}
								else {resultingSegment=typeName+"_"+listenerType+`(() => `+fullType.expected.encasing[0]; }
							}
							segmentHadListener = true;
							bracketDepth++;
						}
						if(fullType.type == "parameter-injection"){
							
						}
					}
				});
    
					
				if(!segmentHadListener) {
					let inQuote = false;
					let quoteChar = null;
        
					for(let i = 0; i < resultingSegment.length; i++) {
						let char = resultingSegment[i];
            
						if ((char === '"' || char === "'" || char === "`") && (i === 0 || resultingSegment[i - 1] !== "\\")) {
							if (!inQuote) {
								inQuote = true;
								quoteChar = char;
							} else if (char === quoteChar) {
								inQuote = false;
								quoteChar = null;
							}
							continue;
						}
            

						if (!inQuote) {
							
							if (char === '{') {
								bracketDepth++;
							} else if (char === '}') {
								bracketDepth--;
								let levelList = Object.keys(containerLevels);
								levelList.forEach(levelId => {
									let currentLevel = containerLevels[levelId];
									if(currentLevel.depth === bracketDepth && !currentLevel.complete) {
										currentLevel.complete = true;
										if(currentLevel.replacementType == "function"){
											resultingSegment = appendTokens(resultingSegment,[currentLevel.encasing[1]],',"'+objectName+'") ');
										}
									}
								});
							}
						}
					}
				}
  
				result += resultingSegment;
			});
			currentObject.scripts.push(result);
		}
		Scene.loop();
		for(let i=0;i<objectNames.length;i++){
			let objectName = objectNames[i];
			let currentObject = Scene.Sprites[objectName];
			eval(`(()=>{
				${currentObject.scripts[1]} 
			})();`);
		}
	}
}	
