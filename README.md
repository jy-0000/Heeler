# Heeler
<img src="./img/logo/logo.png" width="64" height="64" alt="Heeler Logo"> <br>
A custom environment/emulator for Flash Player and creating flash content in real-time. Uses AOT Actionscript 2 to Javascript for scripting capabilities.
Future plans include SWF parsing and Sprites + Shapes "abstraction" system for conversion to simple js representation.
(Prototype)

#About
index.html includes a demo with basic UI also accessible by Github pages.
heeler.execute.js and heeler.parse.js should run on their own, best at the bottom of the page after all your content.

#Example
```js
let heelerContents = Heeler.spawn();
		
let heelerCanvas = heelerContents.element;
		
heelerCanvas.style.border = "2px solid gray";
Heeler.run();
```

# To do
- [x] Add bracket depth system for tracking position of proper syntax replacement
- (25%) Add list of valid parameters for listener types and more
- [ ] Add context to bracket depths
- [ ] Add more detailed fill system 
- (1%) Add more vector variety
- [ ] Add basic .SWF parsing
