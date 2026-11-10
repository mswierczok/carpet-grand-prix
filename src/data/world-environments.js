/* Calendar order is presentation-only; no track data is modified. */
(() => {
 const definitions = [
 ['Bahrain','carpet','#c7b28f','#d4c09c','bear,book,blocks,drawing,ball'],
 ['Luxemburg','wood','#d2b590','#dfc6a4','blocks,book,ball'],
 ['Kanada','desk','#b68b63','#d2b38a','pencil,drawing,book'],
 ['Frankreich','check','#c5a7a0','#e1c9b7','bear,book,ball'],
 ['Schweiz','carpet','#afb0a9','#d3d0bc','mountain,blocks,bear'],
 ['Portugal','stone','#d0b395','#e1c9a6','plant,ball,drawing'],
 ['Indien','mat','#9dae9b','#d0c6a4','blocks,ball,book'],
 ['Brasilien','carpet','#afa582','#d6c29c','plant,plant,ball'],
 ['Südafrika','stone','#b1aca0','#d4c8b0','plant,ball,blocks'],
 ['Korea','desk','#bc9b78','#dac6a1','blocks,book,drawing'],
 ['USA','carpet','#8b9192','#c3c1af','ball,book,blocks'],
 ['Belgien','wood','#b99b78','#d7bd97','toybox,blocks,bear'],
 ['Schweden','wood','#d2c9b5','#e1d8bc','book,ball,blocks'],
 ['Deutschland','desk','#b6a992','#ded1b4','ruler,blocks,drawing'],
 ['Japan','mat','#aabdb1','#d5d3b1','building,building,blocks'],
 ['China','blanket','#bfabb0','#e2ccb5','bear,book,ball'],
 ['Russland','wood','#ad9479','#d0b89b','blocks,toybox,book'],
 ['Australien','stone','#c8a181','#dfbc96','plant,ball,blocks'],
 ['England','pattern','#aaa38e','#d3c4a6','book,bear,ball'],
 ['Italien','tile','#d0c8b5','#e7dcc2','plant,blocks,ball'],
 ['Ungarn','check','#b7adb8','#dbccbe','bear,drawing,book'],
 ['Abu Dhabi','carpet','#ccba93','#e2cda5','building,building,blocks']
 ];
 globalThis.CGPEnvironments = Object.freeze(definitions.map(([name,material,background,road,props])=>Object.freeze({name,material,background,road,props:Object.freeze(props.split(','))})));
})();
