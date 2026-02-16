# Heeler
<img src="./img/logo/logo.png" width="64" height="64" alt="Heeler Logo"> <br>
A custom environment/emulator for Flash Player and creating flash content in real-time. Uses AOT Actionscript 2 to Javascript for scripting capabilities.
Future plans include SWF parsing and Sprites + Shapes "abstraction" system for conversion to simple js representation.
(Hacky prototype mess)

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
- [x] Add bracket depth system for tracking position of proper syntax replacement
- (25%) Add list of valid parameters for listener types and more
- [ ] Add context to bracket depths
- [ ] Add more detailed fill system 
- (1%) Add more vector variety
- [ ] Add basic .SWF parsing
