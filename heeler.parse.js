//this is an html5/javascript representation of a flash scene for demo purposes. true emulation would parse an swf and fit the Scene object to that. 
let Scene = {
	width:550,
	height:400,
	FPS:5,
};
let heeler_output;
let heeler_dump;
let ctx;
let dump;
Scene.Shapes = {
		"shapeButton":{
			type:['rectangle'],
			vector:{
				width:300,height:90,fill:'red',strokeColor:'black',strokeWidth:1
			},
			frames: [
				this.vector, //frame 1
				{x:0,y:0,width:300,height:90,fill:'orange',strokeColor:'black',strokeWidth:1},
				{x:5,y:5,width:320,height:90,fill:'yellow',strokeColor:'black',strokeWidth:1.25},
				{x:10,y:10,width:340,height:90,fill:'green',strokeColor:'black',strokeWidth:1.50},
				{x:15,y:15,width:360,height:90,fill:'blue',strokeColor:'black',strokeWidth:1.75},
				{x:20,y:20,width:380,height:90,fill:'violet',strokeColor:'black',strokeWidth:2},
				{x:25,y:25,width:400,height:90,fill:'magenta',strokeColor:'black',strokeWidth:2.25},
			]
		},
		"shapeBase":{
			type:['rectangle'],
			vector:{
				width:300,height:150,fill:'rgb(255,140,140)',strokeColor:'orange',strokeWidth:1
			},
			frames: [
				this.vector, //frame 1
			]
		}
};
Scene.Sprites = {
		"button":{
			type:['rectangle','symbol'], 
			scripts:[`
			    var playMode = false;
			    function blueHeeler(){
					if(!playMode){
			        play();
					playMode = true;
					} else {
						stop();
						playMode = false;
					}
				    trace("hollo werld 2 if(){}");
					
				}
				on (press) {
				    blueHeeler();
                 }
				trace("hollo werld 1");
			`],
			vector:{x:200,y:200,width:300,height:150},
			spriteLayer:[
				'shapeBase',
				'shapeButton'
			]
		}
};

let Heeler = {spawn:()=>{
	let newHeelerCanvas = document.createElement('canvas');
	let newHeelerDump = document.createElement('canvas');

	newHeelerDump.width = 800;
	newHeelerDump.height = 600;
	newHeelerCanvas.width = Scene.width;
	newHeelerCanvas.height = Scene.height;

	newHeelerCanvas.id = 'heeler_output';
	newHeelerDump.id = 'heeler_dump';
	document.body.appendChild(newHeelerCanvas);
	document.body.appendChild(newHeelerDump);
	
	
	heeler_output = document.getElementById('heeler_output');
	heeler_dump = document.getElementById('heeler_dump');
	ctx = heeler_output.getContext('2d');
	dump = heeler_dump.getContext('2d');
	
	heeler_output.style.backgroundColor = "white";
	heeler_dump.style.display = 'none';
	
	return {element:heeler_output};
}};
