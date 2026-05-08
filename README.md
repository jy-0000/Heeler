# Heeler
<img src="./img/logo/logo.png" width="64" height="64" alt="Heeler Logo"> <br>
A custom environment/emulator for Flash Player and creating flash content in real-time. Uses AOT Actionscript 2 to Javascript for scripting capabilities. (Hacky mess) 
This emulator differs from others due to the abstraction/scene system. The end goal is to allow users to parse SWF's, modify SWF's entirely in the browser outside of JPEXS/adobe flash, and repackage said SWF'S for the web to be modified as if it were regular javascript or page content. 

Heeler parses Actionscript 2 and in the future AS3, which can be combined with javascript however you like as long as it makes sense.
You are not allowed to artificially breed mutant babies between keywords.

# About
index.html includes a demo with basic UI also accessible by Github pages.
heeler.execute.js and heeler.parse.js should run on their own, best at the bottom of the page after all your content.

# Example
Spawn the heeler canvas and execute the flash contents.
```js
let heelerContents = Heeler.spawn();
		
let heelerCanvas = heelerContents.element;
		
heelerCanvas.style.border = "2px solid gray";
Heeler.run();
```
You can also get the SWF Scene representation, and swap it out.
```js
let heelerScene = Heeler.getScene();
//heelerScene.Sprites, heelerScene.Shapes, etc

//make changes you want

Heeler.swapScene(heelerScene)
```
# To do 
<!-- THESE PERCENTAGE NUMBERS COME FROM THIN  FUCKING AIR, PLS HELP ME MAKE THEM MORE REALISTIC -->
- [x] Add bracket depth system for tracking position of proper syntax replacement
- (1%) Add list of valid parameters for listener types and more
- [ ] Add context to bracket depths
- [ ] Add more detailed fill system 
- (1%) Add more vector variety
- [ ] Add basic .SWF parsing
