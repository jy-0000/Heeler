//this is an html5/javascript representation of a flash object for demo purposes. true emulation would parse an swf and fit the Scene object to that. 
//actionscript 2 below is compiled into js ahead of time. the javascript result proceeds as usual through the browser definition of eval()
let ctx = heeler_output.getContext('2d');
let dump = heeler_dump.getContext('2d');
let Scene = {
	width:550,
	height:400,
	Objects: {
		"button":{
			type:['rectangle','symbol'], 
			scripts:[`
				on (release) {
				    var x = 5;
				    if(x > 1){
					    trace("hollo if(){} werld 2");
				    }
					gotoAndPlay(10);
                   }
				trace("hollo werld 1");
			`],
			vector:{
				x:100,y:100,width:300,height:90,fill:'red'
			},
			frames: [
				{x:100,y:100,width:300,height:90,fill:'red'}, //frame 1
				{x:100,y:100,width:300,height:90,fill:'orange'},
				{x:100,y:100,width:300,height:90,fill:'yellow'},
				{x:100,y:100,width:300,height:90,fill:'green'},
				{x:100,y:100,width:300,height:90,fill:'red'},
				{x:100,y:100,width:300,height:90,fill:'orange'},
				{x:100,y:100,width:300,height:90,fill:'yellow'},
				{x:100,y:100,width:300,height:90,fill:'green'},
				{x:100,y:100,width:300,height:90,fill:'red'},
				{x:100,y:100,width:300,height:90,fill:'blue'}, //frame 10
			]
		}
	},
};
