//this is an html5/javascript representation of a flash object for demo purposes. true emulation would parse an swf and fit the Scene object to that. 
//actionscript 2 below is compiled into js ahead of time. the javascript result proceeds as usual through the browser definition of eval()
let ctx = heeler_output.getContext('2d');
let dump = heeler_dump.getContext('2d');
let Scene = {
	width:550,
	height:400,
	FPS:15,
	Shapes: {
		"shapeButton":{
			type:['rectangle'],
			vector:{
				width:300,height:90,fill:'red',strokeColor:'black',strokeWidth:1
			},
			frames: [
				this.vector, //frame 1
				{x:0,y:0,width:300,height:90,fill:'orange',strokeColor:'black',strokeWidth:1},
				{x:5,y:5,width:300,height:90,fill:'orange',strokeColor:'black',strokeWidth:1.25},
				{x:10,y:10,width:300,height:90,fill:'orange',strokeColor:'black',strokeWidth:1.50},
				{x:15,y:15,width:300,height:90,fill:'orange',strokeColor:'black',strokeWidth:1.75},
				{x:20,y:20,width:300,height:90,fill:'orange',strokeColor:'black',strokeWidth:2},
				{x:25,y:25,width:300,height:90,fill:'orange',strokeColor:'black',strokeWidth:2.25},
				{x:30,y:30,width:300,height:90,fill:'orange',strokeColor:'black',strokeWidth:2.50},
				{x:35,y:35,width:300,height:90,fill:'orange',strokeColor:'black',strokeWidth:2.75},
				{x:40,y:40,width:300,height:90,fill:'orange',strokeColor:'black',strokeWidth:3}, //frame 10
			]
		}
	},
	Sprites: {
		"button":{
			type:['rectangle','symbol'], 
			scripts:[`
				function goat(){
					var x = 5;
				    if(x > 1){
					    trace("hollo if(){} werld 2");
				    }
					play();
				}
				on (release) {
				    goat();
                 }
				trace("hollo werld 1");
			`],
			vector:{x:100,y:100,width:300,height:90},
			spriteLayer:[
				'shapeButton'
			]
		}
	},
	
};
