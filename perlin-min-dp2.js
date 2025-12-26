

import * as THREE from "./three.js/three.module.js"

import {getShaderBuffer} from "./geometrybuffer.js"
import {getShaderMaterial} from "./geometrymaterial.js"


import {noise} from "./perlin-sphere-3.js"


const generate_3D = false;
//-------------------------
// Usage : 

const dotCount = 5;
const dotSpan = dotCount*2+1;

let oldx = 0; let oldy = 0;

var config = {
	patchSize : 128,
	generations : 7,
	"2D" : true,
	left : 32,    // default left side (entry)
	right : 96,   // default right side (exit)
	nodes : [],  // trace of A*Path
	base : 0,
	seed : Date.now(),
	
	canvas :null,
	ctx : null,
	canvas2 : null,
	ctx2 : null,
	inputData : null,
	ctxInputData : null,
	iconLocdata : null,
	viewer : null,
	things : null,
}

const things = new THREE.TextureLoader().load( 'images/emoji_sprite_sheet_small.png' );

let height = noise( 1.0, config );


class LocationTracker {
	icons = [];
	slots = 0;
	width = 64;
	height = 64;
	imageData = null;
	canvas = null;
	constructor(canvas, data) {
		// this works with config.iconLoc
		// 

		this.canvas = canvas;
		this.data = data;
		this.imageData = data.ctx.getImageData(0, 0, canvas.width, canvas.height);
		this.output = this.imageData.data;
		this.slots = ( canvas.width *canvas.height ) / 4;  // this could just be 1...
	
	}
	hideIcon( x, y ) {
		const gx = Math.floor( x/(2048/128) );
		const gy = Math.floor( y/(2048/128) );

		const pos = gx + gy*128;
		const output_offset = (pos*4 + 0)*4

			this.output[output_offset+3] = 0; 
		
	}
	setIcon( type, x, y ) {

		const gx = Math.floor( x/(2048/128) );
		const gy = Math.floor( y/(2048/128) );

		const pos = gx + gy*128;
		const output_offset = (pos*4 + 0)*4

		const here = type/128; // some symbol 
			this.output[output_offset+8] = Math.floor(here %1 * 256);
			this.output[output_offset+9] = Math.floor(((here /256 )%1)*256);
			this.output[output_offset+10] = Math.floor((here /(256*256)%1)*256);
			this.output[output_offset+11] = 255; // full alpha for visible.
			//console.log( 'generate:', type, this.output[output_offset+8], this.output[output_offset+9], this.output[output_offset+10] );
		
	}
	addIcon( type, x, y ) {
		// do these move?
		
		const gx = Math.floor( x/(2048/128) );
		const gy = Math.floor( y/(2048/128) );

		//console.log( "Icon location getting added...", x, y, gx, gy, type );

		//const icon = {type:type, x:x, y:y};
 
		const pos = gx + gy*128;
		
		x = x / 2048;
		y = y / 2048;
		const output_offset = (pos*4 + 0)*4

		this.output[output_offset+0] = Math.floor(x * 128);
		this.output[output_offset+1] = Math.floor(((x * 128)%1)*128);
		this.output[output_offset+2] = Math.floor((x * 128*128*128)%128);
		this.output[output_offset+3] = 255; // full alpha for visible.

		this.output[output_offset+4] = Math.floor(y * 128);
		this.output[output_offset+5] = Math.floor(((y * 128)%1)*128);
		this.output[output_offset+6] = Math.floor((y * 128*128*128)%128);
		this.output[output_offset+7] = 255; // full alpha for visible.

		const here = type/128; // some symbol 
			this.output[output_offset+8] = Math.floor(here %1 * 256);
			this.output[output_offset+9] = Math.floor(((here /256 )%1)*256);
			this.output[output_offset+10] = Math.floor((here /(256*256)%1)*256);
			this.output[output_offset+11] = 255; // full alpha for visible.
			//console.log( 'generate:', pos, output_offset, this.output[output_offset+8], this.output[output_offset+9], this.output[output_offset+10] );
                
		
	}
	flush() {
		this.data.ctx.putImageData(this.imageData, 0,0);
		this.data.tex.needsUpdate = true;

	}
}



if( typeof document !== "undefined" ) {
	config.canvas = document.getElementById( "testSurface" );
        config.ctx = config.canvas.getContext("2d");
	config.canvas2 = document.getElementById( "testSurface2" );
       // config.ctx2 = config.canvas2.getContext("2d");
	//debugger;
	config.iconLoc = document.createElement( "canvas") ;
	document.body.appendChild( config.iconLoc );
	config.iconLoc.style.position = "absolute"
	config.iconLoc.style.top = "80vh"
	{
		config.iconLocdata = { ctx:config.iconLoc.getContext("2d"), tex: new THREE.CanvasTexture( config.iconLoc )
				, data : null };
		config.iconLoc.width = 128*4;
		config.iconLoc.height = 128;
		config.things = new LocationTracker( config.iconLoc, config.iconLocdata );

//		config.things.addIcon( 1, 1024, 1024 );
		config.things.addIcon( 257, 1024, 1024 );
	//if(0)
		for( let n = 0; n < 50; n ++ )
			config.things.addIcon( Math.floor( 64*64*Math.random() ), Math.floor( 2048*Math.random() ),Math.floor( 2048*Math.random() ) );
		config.things.flush();
	}

	// generates the heightmap data...
	config.inputData = [ document.createElement( "canvas") ];

	let start = Date.now();

	
    config.ctxInputData = config.inputData.map( canvas=>{
		const data = { ctx:canvas.getContext("2d"), tex: new THREE.CanvasTexture( canvas ), data : null };
		canvas.width = 2048;
		canvas.height = 2048;
		data.data = makeReelTexture( data.ctx );
		data.tex.needsUpdate = true;
		console.log( "Took to get texture:", Date.now() - start );
		start = Date.now();
		// debug
		//document.body.appendChild( canvas );
		return data;
	});
	
	config.viewer = await setupWorldView( "testSurface2" );

} else {
	config.lib = true;
}


function makeReelTexture( ctx ) {
	var _output = ctx.getImageData(0, 0, 2048, 2048);
	var output = _output.data;
	let output_offset = 0;
	for( let x = 0; x < 2048; x++ ) {
		for( let y = 0; y < 2048; y++ ) {
			var here = height.get2( x, y, 0 )/65536;

			output[output_offset+0] = ( here * 128)|0; 
			output[output_offset+1] = ((here * 128*128)%128)|0; 
			output[output_offset+2] = ((here * 128*128*128)%128)|0;
			output[output_offset+3] = 255; 
			output_offset += 4;
		}
	}

	ctx.putImageData(_output, 0,0);
	return _output;
}



let turnDown = false;
let turnLeft = false;
let speedDown = false;
let speedUp = false;

const BASE_COLOR_WHITE = [255,255,255,255];
const BASE_COLOR_BLACK = [0,0,0,255];
const BASE_COLOR_DARK_BLUE = [0,0,132,255];
const BASE_COLOR_MID_BLUE = [0x2A,0x4F,0xA8,255];
const BASE_COLOR_RED = [127,0,0,255];
const BASE_COLOR_LIGHT_TAN = [0xE2,0xB5,0x71,255];    //E2B571
const BASE_COLOR_YELLOW = [255,255,0,255];
const BASE_COLOR_LIGHTBLUE = [0,0,255,255];
const BASE_COLOR_LIGHTCYAN = [0,192,192,255];
const BASE_COLOR_DARK_BLUEGREEN = [0x06, 0x51, 0x42,255];
const BASE_COLOR_LIGHTRED = [255,0,0,255];
const BASE_COLOR_LIGHTGREEN = [0,255,0,255];
const BASE_COLOR_DARK_GREEN = [0,93,0,255];
const BASE_COLOR_DARK_BROWN = [0x54,0x33,0x1c,255];  //54331C


//const RANGES = [BASE_COLOR_BLACK, BASE_COLOR_DARK_BLUE, BASE_COLOR_DARK_GREEN, BASE_COLOR_LIGHT_TAN, BASE_COLOR_DARK_BROWN, BASE_COLOR_WHITE, BASE_COLOR_BLACK ];
//const RANGES_THRESH = [0, 0.01, 0.25, 0.50, 0.75, 0.99, 1.0 ];

const RANGES = [BASE_COLOR_BLACK, BASE_COLOR_DARK_BLUE, BASE_COLOR_MID_BLUE, BASE_COLOR_LIGHT_TAN, BASE_COLOR_DARK_GREEN, BASE_COLOR_LIGHT_TAN, BASE_COLOR_DARK_BROWN, BASE_COLOR_WHITE, BASE_COLOR_BLACK ];
const RANGES_THRESH = [0, 0.02, 0.20, 0.24, 0.29, 0.50, 0.75, 0.99, 1.0 ];



var w = 0;
var h = 0;
var h2 = 0;
var h2Target = 20;
var wO = 0;
var hO = 0;


let wstride = 0;//( 20 * Math.random() - 10 ) ;
let hstride = 0;//( 20 * Math.random() - 10 ) ;
let slen = 0;//Math.sqrt(wstride*wstride+hstride*hstride);
const stridea = 0;//Math.acos( hstride/slen );
let strideangle = Math.random()*(2*Math.PI);


init( config );

function init( config ) {
	if( config.lib ) {
	} else {
	}

	var myNoise = noise( 0, config );

	if( config.canvas ) {
		drawData( myNoise, config );
	}


	function stepPlasma() {
		if( config.canvas ) {
			drawData( myNoise, config );
		}
		setTimeout( stepPlasma, 10 );
	}
	stepPlasma();


}

function ColorAverage( a, b, i,m) {

    var c = [ (((b[0]-a[0])*i/m) + a[0])|0,
        (((b[1]-a[1])*i/m) + a[1])|0,
        (((b[2]-a[2])*i/m) + a[2])|0,
		(((b[3]-a[3])*i/m) + a[3])|0
             ]
    //c[3] -= c[1];
    //console.log( "color: ", a, b, c, i, ((b[1]-a[1])*i/m)|0, a[1], ((b[1]-a[1])*i/m) + a[1] )
    return c;//`#${(c[0]<16?"0":"")+c[0].toString(16)}${(c[1]<16?"0":"")+c[1].toString(16)}${(c[2]<16?"0":"")+c[2].toString(16)}`
}

function drawData( noise, config ) {
	//ctx.clearRect( 0, 0, 768, 768 );
	//var _input = config.ctxInputData[0].ctx.getImageData(0, 0, 2048, 2048);
	var _input = config.ctxInputData[0].data.data;

	var _output = config.ctx.getImageData(0, 0, 768, 768);
	const outputHeight = _output.height;
	const outputWidth = _output.width;
	var output = _output.data;
	var surface = null;
	var output_offset = 0;
	

    function plot(b,c,d) { 
	//console.log( "output at", output_offset, d )
	const output_offset = Math.floor((c*outputWidth+b)*4);
        output[output_offset+0] = d[0]; 
        output[output_offset+1] = d[1]; 
        output[output_offset+2] = d[2]; 
	const newAlpha = output[output_offset+3] + d[3];
	if( newAlpha > 255 )         output[output_offset+3] = 255; 
	else    output[output_offset+3] = newAlpha; 
        //output_offset+=4
        //output++;
    }

	const del =	Math.abs(wO-oldx)+Math.abs(hO-oldy);
	let mult = 0.99;
	if( del > 3 ) mult = 0.2;
	
	for( let o = 0; o < outputWidth*outputHeight*4; o += 4 ) {
		let old = output[o+3]; 
		if( old ) {
			//if( old > 64 ) output[o+3] = old-1;
			//else 
			output[o+3] = Math.floor(old * mult);
		}
	}
	oldx = wO; oldy = hO;
	const clr = [235,235,0,255];
	const clr2 = [235,0,235,255];
	for( let b of config.viewer.dots ) {
		plot( Math.floor((b.position.x + 0.5)*768), Math.floor((0.5-b.position.y ) * 768), clr );
		
	}
	for( let b of config.viewer.dots_inv ) {
		plot( Math.floor((b.position.x + 0.5)*768), Math.floor((0.5-b.position.y ) * 768), clr2 );
		
	}


	config.ctx.putImageData(_output, 0,0);

}


export {noise}


//updateMotion();
function updateMotion( delta, viewer ) {

	delta /= 1000;
			const _input = config.ctxInputData[0].data.data;

{
if( viewer.dots.length )
	for( let x = -dotCount; x <= dotCount; x++ ) for( let y = -dotCount; y <= dotCount; y++ ) 
	{
		const b = (x+dotCount)+(y+dotCount)*dotSpan;
		
//for( let b = 0; b < viewer.dots.length; b++ ) 
		const body= viewer.dots[b];
		const speed = viewer.speeds[b];

			const inputIndex = ((( 1024 +((body.position.x)/ 32.0)*2048 +wO)|0) + (( 1024 +(((body.position.y)/32)*2048)+hO )|0) * 2048 )*4;
			let here = (_input[ inputIndex+0]*128*128 + _input[ inputIndex+1] * 128 + _input[ inputIndex+2] )/(128*128*128);

			const hx = Math.cos((here)*8*Math.PI); // 0 is no change, and increase to 1 is toward the right.
			const hy = -Math.sin((here)*8*Math.PI); // so 0 points down.  (increasing X is increasing UV from 0 0 to 1 1 );

			speed.x = /*speed.x*0.2 +*/ 0.1 * hx;
			speed.y = /*speed.y*0.2 +*/ 0.1 * hy;

	   		
		    if( body.position.x > 0.5 || body.position.x < -0.5 || 
				body.position.y > 0.5 || body.position.y < -0.5 ){
				body.position.x =  x/dotSpan;//(b%10) / 10-0.5;
				body.position.y =  y/dotSpan;//Math.floor(b/10) / 10-0.5;
		
			}else {
				body.position.x = body.position.x + speed.x*delta;// (b%10) / 10-0.5;
				body.position.y = body.position.y + speed.y*delta;// (b%10) / 10-0.5;
			}

	}
}


{
if( viewer.dots_inv.length )
	for( let x = -dotCount; x <= dotCount; x++ ) for( let y = -dotCount; y <= dotCount; y++ ) 
	{
		const b = (x+dotCount)+(y+dotCount)*dotSpan;
		
//for( let b = 0; b < viewer.dots.length; b++ ) 
		const body= viewer.dots_inv[b];
		const speed = viewer.speeds[b];

			const inputIndex = ((( 1024 +((body.position.x)/ 48.0)*2048 +wO)|0) + (( 1024 +(((body.position.y)/48)*2048)+hO )|0) * 2048 )*4;
			let here = (_input[ inputIndex+0]*128*128 + _input[ inputIndex+1] * 128 + _input[ inputIndex+2] )/(128*128*128);
			

			const hx = -Math.cos((here)*8*Math.PI);
			const hy = Math.sin((here)*8*Math.PI);

			speed.x = /*speed.x*0.2 +*/ 0.1 * hx;
			speed.y = /*speed.y*0.2 +*/ 0.1 * hy;

	   		
		    if( body.position.x > 0.5 || body.position.x < -0.5 || 
				body.position.y > 0.5 || body.position.y < -0.5 ){
				body.position.x =  x/dotSpan;//(b%10) / 10-0.5;
				body.position.y =  y/dotSpan;//Math.floor(b/10) / 10-0.5;
		
			}else {
				body.position.x = body.position.x + speed.x*delta;// (b%10) / 10-0.5;
				body.position.y = body.position.y + speed.y*delta;// (b%10) / 10-0.5;
			}
	}
}



{

			//let here = noise.get( 128*w/_output.width +wO, 128*h/_output.height+hO, h2 );
			const inputIndex = ((( 1024 +0 +wO)|0) + (( 1024 +hO )|0) * 2048 )*4;
			let here = (_input[ inputIndex+0]*128*128 + _input[ inputIndex+1] * 128 + _input[ inputIndex+2] )/(128*128*128);
			//let here = (_input[ inputIndex+0]*256*256 + _input[ inputIndex+1] * 256 + _input[ inputIndex+2] )/(256*256*256);
			// direciton of 'here'
			const hx = Math.sin((here)*8*Math.PI);
			const hy = Math.cos((here)*8*Math.PI);
			// my look at here
			const hx2 = Math.sin(strideangle);
			const hy2 = Math.cos(strideangle);

			const dot2 = (hx*hx2 - hy*hy2);

			{
				if( dot2 < 0 )
					slen += (-0.25 + dot2 * 2.0) *delta;
				else
					slen += dot2 * 0.5 *delta;
				if( slen< 0 ) slen = 0;
			}

				if( slen> 2 ) slen = 2;

}
slen = 0;

	if( speedDown ) {
		if( !speedUp ) {
			if( slen > 0.2 )
				slen -= 0.2*delta;
		else
			slen = 0;
		}else {
			slen = 1.5;//*delta;
		}
	}
	if( turnDown ){
		if( turnLeft ) {
			strideangle -= 1.59*delta;
		
		}else {
			strideangle += 1.59*delta;
		}
	}
		const hx = Math.sin(strideangle);
		const hy = Math.cos(strideangle);
		wstride = slen * hx;
		hstride = slen * hy;
 }

document.body.addEventListener( "keydown", (evt)=> {
	if( evt.keyCode == 65 ) {
		turnDown = true;
		turnLeft = true;
	}
	if( evt.keyCode == 68 ) {
		turnDown = true;
		turnLeft = false;
	}
	if( evt.keyCode == 83 ) {
		speedDown = true;
		speedUp = false;
	}
	if( evt.keyCode == 87 ) {
			speedDown = true;
			speedUp = true;
	}
	//console.log( "ke:", evt );
} );

document.body.addEventListener( "keyup", (evt)=> {
	if( evt.keyCode == 65 ) {
		turnDown = false;
		turnLeft = true;
	}
	if( evt.keyCode == 68 ) {
		turnDown = false;
		turnLeft = false;
	}
	if( evt.keyCode == 83 ) {
		speedDown = false;
		speedUp = false;
	}
	if( evt.keyCode == 87 ) {
			speedDown = false;
			speedUp = true;
	}
	//console.log( "ke:", evt );
} );

// find nearest does a recusive search and finds nodes
// which may qualify for linking to the new node (to).
// from is some source point, in a well linked web, should be irrelavent which to start from
// paint is passed to show nodes touched during the (last)search.





export async function setupWorldView( canvasId ) {
	var viewer = {
		canvas: document.getElementById( canvasId ),
		renderer : null,
		renderer_a : null,
		target : 0,
		renderTarget_a : null,
		renderer_b : null,
		renderTarget_b : null,
		ballObject : null,
		scene : new THREE.Scene(),
		camera : null,
		controls : null,
		composer : null,
		reel : null,
		reelAxis : null,
		shaderMat :null,
		dots : [],
		dots_inv : [],
		speeds : [],
	};
	const gl = viewer.canvas.getContext('webgl2');
		viewer.renderer = new THREE.WebGLRenderer( { canvas: viewer.canvas, context:gl } );

		viewer.camera = new THREE.PerspectiveCamera( 53, viewer.canvas.width / viewer.canvas.height, 0.001, 100 );
	
viewer.renderer_a = new THREE.WebGLRenderer();
viewer.renderTarget_a = new THREE.WebGLRenderTarget(512, 512);	

viewer.renderer_b = new THREE.WebGLRenderer();
viewer.renderTarget_b = new THREE.WebGLRenderTarget(512, 512);	

		//viewer.camera.matrixAutoUpdate = false;
//		viewer.camera.position.z = -20;
		viewer.camera.position.z =1;
//		new lnQuat(0,0, Math.PI, 0 ).update().exp( viewer.camera.quaternion );
		//viewer.camera.matrix.rotateRelative( 0.19229568617010028,-0.9214720761189179, 0 );
		//viewer.camera.matrix.rotateRelative( 0.19229568617010028,-0.2914720761189179, 0 );
		//viewer.camera.matrix.rotateRelative( 0.19229568617010028, 0, 0 );
		//viewer.camera.matrix.rotateRelative( 0.19229568617010028, 0, 0 );

		//viewer.camera.position.set(0, 0, -8);
		viewer.scene.add(viewer.camera);

		viewer.renderer.setClearColor( 0x333333, 1 );

		viewer.reel = new THREE.Object3D();

if(1) {
		 // for phong hello world test....
 		var light = new THREE.PointLight( 0xffFFFF, 1, 100 );
 		light.position.set( 0, 20, 100 );
 		viewer.scene.add( light );
}		


		//var controlNatural = new NaturalCamera( viewer.camera, viewer.renderer.domElement );
		//controlNatural.enable( );
//if(0)
	for( let x = -dotCount; x <= dotCount; x++ ) for( let y = -dotCount; y <= dotCount; y++ ) 
		//for( let b = 0; b < 100; b++ ) 
		{
			//const b = (x+dotCount)+(y+dotCount)*15;
		

			const planeGeom = new THREE.PlaneGeometry( 0.01, 0.01 );;
			const material = new THREE.MeshBasicMaterial( {color: 0xaaaa00, side: THREE.DoubleSide} );
			const body = new THREE.Mesh( planeGeom, material );
			body.position.z = 0.001;
			body.position.x = x/dotSpan;//  ((b%10) / 10)-0.5;
			body.position.y = y/dotSpan;//   (((b/10)|0) /10)-0.5;
			viewer.speeds.push( new THREE.Vector3( 0, 0, 0 ) );
			viewer.dots.push(body );
			viewer.scene.add( body );			

			const material2 = new THREE.MeshBasicMaterial( {color: 0xaa00aa, side: THREE.DoubleSide} );
			const body2 = new THREE.Mesh( planeGeom, material2 );
			body2.position.z = 0.001;
			body2.position.x = x/dotSpan;//  ((b%10) / 10)-0.5;
			body2.position.y = y/dotSpan;//   (((b/10)|0) /10)-0.5;
			viewer.speeds.push( new THREE.Vector3( 0, 0, 0 ) );
			viewer.dots_inv.push(body2 );
			viewer.scene.add( body2 );			

		}

		//viewer.controls = controlNatural;

	const planeGeom = new THREE.PlaneGeometry( 1, 1 );;
	const material = new THREE.MeshBasicMaterial( {color: 0x444400, side: THREE.DoubleSide} );
	material.map = 	config.ctxInputData[0].tex;

	const plane = new THREE.Mesh( planeGeom, material );
//	viewer.scene.add( plane );

	viewer.shaderMat = await getShaderMaterial();
	viewer.shaderMat.uniforms.map_ul.value = config.ctxInputData[0].tex;
        viewer.shaderMat.uniforms.icons.value = things;
        viewer.shaderMat.uniforms.icon_loc.value = config.iconLocdata.tex;



	viewer.shaderBuf = getShaderBuffer();
	
	viewer.shaderBuf.AddQuadTexture( {x:0,y:0,z:-1}, {x:-0.5, y:-0.5, z:0}, {x:0.5, y:-0.5, z:0}, {x:-0.5, y:0.5, z:0},{x:0.5, y:0.5, z:0}
					//, {uv_array:[0,0,1,0,0,1,1,1] } )
					, {uv_array:[0,1,1,1,0,0,1,0] } )
	viewer.shaderBuf.markDirty();
	const plane2 = new THREE.Mesh( viewer.shaderBuf.geometry, viewer.shaderMat );
	viewer.scene.add( plane2 );
	

	let start = 0;
	let sec =  5;

	function animate(ts) {
		if( !start ) start = ts;
		const delta = ts-start;
		start = ts;
		const sc = Math.floor(ts/1000);
		if( sc > sec ) {
			config.things.setIcon( Math.floor( (29*29-256)*Math.random()+256 ), 1024, 1024 );
			config.things.flush();
			sec=sc;
		}
	updateMotion(delta, viewer);

	  hO += hstride * ( delta / 100 );
	   wO += wstride * ( delta / 100 );
	
		if(wO < -1000) 
			wO = 1000;
		else if(wO > 1000) 
			wO = -1000;
		if(hO < -1000 ) 
			hO = 1000;
		else if(hO > (1000)) 
			hO = -1000;


        	viewer.shaderMat.uniforms.x.value = wO;
        	viewer.shaderMat.uniforms.y.value = hO;
        	viewer.shaderMat.uniforms.angle.value = strideangle;



			viewer.renderer.render( viewer.scene, viewer.camera );
		//else
		//	viewer.composer.render( viewer.scene, viewer.camera );
	        
                //brainBoard.board.BoardRefresh();
                requestAnimationFrame(animate);
	}
	requestAnimationFrame(animate);

	return viewer;
}
