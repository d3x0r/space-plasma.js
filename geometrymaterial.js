import * as THREE from "./three.js/three.module.js"


export function getShaderMaterial() {
    return new THREE.ShaderMaterial( {
	defines:{
		USE_MAP:'',
		USE_UV:'',
	},
	uniforms: {
        x : { type: "f", value : 0 },
        y : { type: "f", value : 0 },
        angle : { type: "f", value : 0 },
        edge_only : { type: "f", value : 0 },
        icons : { type : "t", value : null },
        icon_loc : { type : "t", value : null },
        map_ul : { type : "t", value : null },
        map_ur : { type : "t", value : null },
        map_ll : { type : "t", value : null },
        map_lr : { type : "t", value : null },
		
	},
    transparent : true,
     blending: THREE.NormalBlending,
	vertexShader: `

    #include <common>

    attribute  vec4 in_Color;
    attribute  vec4 in_FaceColor;
    attribute  float in_Pow;

    attribute  float in_use_texture;
    attribute  float in_flat_color;
    attribute  float in_decal_texture;

    attribute  vec2 in_Modulous;
    varying vec4 ex_Color;
    varying vec2 ex_texCoord;
    varying float ex_Dot;
    varying  float ex_Pow;
    varying  float ex_Pow2;
    varying float vDepth;
    varying float ex_use_texture;
    varying float ex_flat_color;
    varying float ex_decal_texture;
    varying vec4 ex_FaceColor;
    #define EPSILON 1e-6

    varying vec4 fe_normal, light_dir, eye_vec, lookat;
    //const float PI =  3.14159265;

    void main() {

    	#include <begin_vertex>

        #include <project_vertex>
    	#include <logdepthbuf_vertex>

    	#include <worldpos_vertex>

        ex_texCoord = uv;

    }`,

fragmentShader:`


    varying vec2 ex_texCoord;

        uniform sampler2D map_ul;
	uniform sampler2D icons;
	uniform sampler2D icon_loc;
        uniform float x;
        uniform float y;
        uniform float angle;

    void main() {


        {
		vec2 realuv;
		vec2 realuv2;
		vec2 realuv3;
		// this is expecting the display to be 512x512

		float pixelx = ( ex_texCoord.x );      // left to right 0-1.0
		float pixely = ( ex_texCoord.y );  // top to bottom 0-1.0 

		// x/y  position is -1024 to 1024
		float x1 = (x)/2048.0;  // -0.5 to 0.5
		float y1 = -(y)/2048.0;  // -0.5 to 0.5  (Vertical inverted)

		// pixel is biased to -0.5 to 0.5, scaled 
		// position is natural.
		
		// a smaller number makes for higher resolution...
		realuv.x = 0.5 + ((pixelx-0.5) / 48.0)  + x1;
		realuv.y = 0.5 + ((pixely-0.5) / 48.0)  + y1;
		
        	vec4 diffuseColor = vec4(  texture2D( map_ul, realuv ).rgb, 1.0 );

			// 'up' is from 1/2H to 0 on the texture so invert cos.
		float dirx = sin(angle);
		float diry = cos(angle); // points down at 0
		vec2 farxy = vec2(dirx*1.0,-diry*1.0);

//( output[output_offset+0]*128*128 +	(output[output_offset+1] *128) +  (output[output_offset+2]) ) / (128*128*128)

		// ------ convert 3 color components to 1 value
			float a = (diffuseColor.r*128.0*128.0 + diffuseColor.g*128.0 + diffuseColor.b)/(128.0*128.0/2.0);
			//float here = (asin(sin(3.14159268/2.0+a*16.0*3.14159268))/3.14159268+1.0)/2.0;
			// had to flip the Y here... not sure where that's happening.
			vec2 toHerexy = vec2(pixelx-0.5, pixely-0.5 ); 

			float toHerex = (pixelx-0.5);
			float toHerey = (pixely-0.5);

			float scale = sqrt(toHerex*toHerex + toHerey*toHerey);
			float hereLen = scale;
			if( scale < 0.000001 ) { // here.
				toHerex = dirx;
				toHerey = diry;
				scale = 0.0;
			}else { 
				scale = 1.0/scale;
				toHerex *= scale;
				toHerey *= scale;
			}
			
			float xdel = ( toHerex ) * 1.0/2048.0/4.0;
			float ydel = ( toHerey ) * 1.0/2048.0/4.0;


		vec2 temp = farxy - toHerexy;
			//float a = 0.0;
			float sum = 0.0;
			float priorDel = 0.0;
			float lastAngle ;
			if( scale > 0.0 ) {
				float nf ;
				for( int n = 0; n < 100; n ++ ) {
					nf = float(n);
					vec2 pt = vec2( xdel*	nf, ydel*nf );
					if( length(pt) < (hereLen/48.0) ) {
						vec2 pt2 = vec2( pt.x+0.5+x1, 0.5-pt.y-y1);
						vec4 color = vec4(  texture2D( map_ul, pt2 ).rgb, 1.0 );
						float val = (color.r*128.0*128.0 + color.g*128.0 + color.b)/(128.0*128.0/2.0);

						float fieldAngle = mod( (val*3.14159*8.0),(2.0*3.14159268))-(3.14159268);
						float xa1 = sin(fieldAngle);
						float ya1 = cos(fieldAngle );
						float dot = ( toHerex * xa1 + toHerey * ya1 );
						
						if( dot > 0.0 ) {
							if( dot > priorDel ) {
								priorDel = dot;
								lastAngle = val;
							}
							sum += dot;
						}
					
						if( sum > 5.0) {
							break;
						}
					}else {
						break; 
					}
				}
			}
			if( sum > 2.0 ) {
				a = lastAngle;				
			}

			float b = sin(a*3.14159*8.0);
			float c = cos(a*3.14159*8.0);
			float dot = b*toHerex+c*toHerey;
				 
			float here_angle = acos( toHerey );
			if( toHerex < 0.0 ) here_angle = -here_angle;


			float dot_angle = (	acos( dot ))/(3.1415968);
			float dot2 = b*dirx + c*diry;
			float angle2 = (	acos( dot2 ))/(3.1415968);


	// ===================  primary calculation of red/green paths.
			
			float fieldAngle = mod( (a*3.14159*8.0),(2.0*3.14159268))-(3.14159268);

			float lookField = (mod(fieldAngle - angle + 2.0*3.145269, 2.0*3.14159268 ) -3.14159268 ) /3.14159268;

		// tests base offset amount... 
		//float delangle = (3.14159268 -mod(here_angle - angle + 3.0*3.145269, 2.0*3.14159268 ) )/3.14159268;
		float delangle = (mod(here_angle - fieldAngle + 2.0*3.145269, 2.0*3.14159268 ) - 3.14159268  )/3.14159268;
		                //delangle = fieldAngle;


			if( delangle < 0.0 ) {
			    	gl_FragColor = vec4(-delangle,0.0,0.0,1.0);
			} else {
				if( dot > 0.0 ) 
				    	gl_FragColor = vec4(0.0, 0.0, delangle,1.0);
			}


			if( dot < 0.0 ) {
				if( dot < -0.5 ) 
				    	gl_FragColor = vec4(0.5+0.4*dot,0.0,0.0,1.0);
				else
				    	gl_FragColor = vec4(0.5+0.4*dot,0.0,0.0,1.0);
			} else {
					
			    		gl_FragColor = gl_FragColor+vec4(0.0,0.2+0.4*dot,  0.0,0.0);
			}



	// --------------------- This bit of code modifies the color according to the direction looking
	/*                
				if( dot2 < 0.0 ) {
					if( angle2 < 0.0 ) {
						gl_FragColor.g += 0.4 - (1.0+dot2)*0.4;
					}
					else{
						gl_FragColor.r +=  0.4-(1.0+dot2)*0.4;
						gl_FragColor.b +=  0.0;
					}
				}else {
					if( dot < 0.0 ){
						gl_FragColor.r +=  0.4 - (1.0-dot2)*0.4;
						//gl_FragColor.g +=  0.4 - (1.0-dot2)*0.4;
					} else {
						gl_FragColor.g +=  0.25-(1.0-dot2)*0.3;
					}
				}           
	                
	/*if( sum/100.0 > 0.7 ) {
		gl_FragColor.r = 1.0;
		gl_FragColor.g = 1.0;
		gl_FragColor.b = 1.0;
	}
	else */
	if( sum > 1.0 ) {
//		gl_FragColor.r = gl_FragColor.r * (1.0-(sum-1.0)/10.0);
//		gl_FragColor.g = gl_FragColor.g * (1.0-(sum-1.0)/10.0);
//		gl_FragColor.b = gl_FragColor.b * (1.0-(sum-1.0)/10.0);
	}
/*
	if( 0.0 > 0.0 ) {
	// shading the height map...
		gl_FragColor.r = (gl_FragColor.r * 0.9 + here*0.1);
		gl_FragColor.g = (gl_FragColor.g * 0.9 + here*0.1);
		gl_FragColor.b = (gl_FragColor.b * 0.9 + here*0.1);
	}
*/

// this 128.0 pixel scalar is how big a single spot on the map can cover...

realuv2.x = 0.5 + ( (pixelx-0.5) / 128.0  + x1 );
realuv2.y = 0.5 + ( (pixely+0.5) / 128.0  + y1 );


// so this is the 128 scalar that determins where the thig is
float xxx = trunc( (realuv2.x ) * 128.0 )/128.0;
float yyy = 1.0-trunc(( realuv2.y ) * 128.0 )/128.0 + 1.0/256.0;

vec2 pt2 = vec2(xxx, yyy); 
//vec2 pt2
vec4 p1 = texture2D(icon_loc, pt2 );

const vec2 plus1 = vec2(1.0/(128.0*4.0) ,0.0);
const vec2 plus2 = vec2(2.0/(128.0*4.0) ,0.0);
const vec2 plus3 = vec2(3.0/(128.0*4.0) ,0.0);


// this is a span of 128 icons, and only one of them should apply
// 
if( p1.a > 0.5 ){
	// there is something in this area...
	vec4 p2 = texture2D(icon_loc, pt2+plus1 );
	vec4 p3 = texture2D(icon_loc, pt2+plus2 );

	float valx = (p1.r*128.0*128.0 + p1.g*128.0 + p1.b)/(128.0*128.0/2.0)-0.5 ;

	float valy = (p2.r + p2.g/128.0 + p2.b/(128.0*128.0))/(1.0/2.0)-0.5;

	float valt = (p3.r*128.0*128.0 + p3.g*128.0 + p3.b)/(128.0*128.0/2.0);

	float t_y = trunc(valt*29.0)/29.0 + 1.0/58.0;
	float t_x = mod(valt*29.0, 1.0) + 1.0/58.0;


	// this is sort of how big the icon can draw... 
//	float delx = (valx - (x1))  ;
//	float dely = (valy - (y1))  ;

	float relx = (valx +(pixelx-0.5)/(1.0*1.0) )  ;
	float rely = (valy +(pixely-0.5)/(1.0*1.0) )  ;

	if( abs( rely + y1*128.0 ) < 0.1 ) gl_FragColor.r=1.0;
	if( abs( relx + x1*128.0 ) < 0.1 ) gl_FragColor.g=1.0;


	// think this is how big the icon data is read... 
	float iconZoom = 1.0;

	realuv3.x = (x1 + pixelx-0.5) / iconZoom + t_x ;
	realuv3.y = (y1 +0.5 - pixely) / iconZoom + t_y ;

	vec4 p4 = texture2D( icons, realuv3 );
	if( p4.a < 0.01 ) return;

	// center x of icon... 
	
	//if( p4.a > 0.0 )
		gl_FragColor = (1.0-p4.a)*gl_FragColor + p4.a*p4;
		gl_FragColor.a = 1.0;
	//	gl_FragColor = p2;

//		gl_FragColor.r = (delx * 16.0 +0.5);
	//gl_FragColor.g = valx*1.0;
	//gl_FragColor.a = 1.0;

	//	gl_FragColor.r = x1;
	//	gl_FragColor.g = y1;

	//gl_FragColor = p1;
	//if( !( abs(delx) < 0.002 || abs(dely) < 0.002 ) )
	{
	//	gl_FragColor.rgb = vec3(0.7,0.7,0.0);
	}
	
}

//gl_FragColor.b = p1.a;

//gl_FragColor.rgb = vec3((pt2.x),(pt2.y),p1.a);


vec4 p2 = texture2D(icon_loc, pt2 );
if( p2.a > 0.5){
	
}
vec4 p3 = texture2D(icon_loc, pt2 );
if( p3.a > 0.5){
	
}
vec4 p4 = texture2D(icon_loc, pt2 );
if( p4.a > 0.5 ){
	
}
vec4 p5 = texture2D(icon_loc, pt2 );
if( p5.a > 0.5 ){
	
}
vec4 p6 = texture2D(icon_loc, pt2 );
if( p6.a > 0.5 ){
	
}
vec4 p7 = texture2D(icon_loc, pt2 );
if( p7.a > 0.5 ){
	
}
vec4 p8 = texture2D(icon_loc, pt2 );
if( p8.a > 0.5 ){
	
}

//vec4 color = vec4(  texture2D( icons, pt2 ).rgb, 1.0 );
//gl_FragColor = color;


// ---------- This bit modifies the color for the direction indicator
	float d = abs( toHerexy.x * farxy.y/farxy.x - toHerexy.y ) / sqrt( 1.0+(farxy.y*farxy.y)/(farxy.x*farxy.x) );
	d=d/0.01;
	vec2 dottmp = toHerexy*farxy;
	float dotdir = dottmp.x+dottmp.y;
//	float l = length(farxy*toHerexy)/length(toHerexy);

		if( (dotdir) > 0.0 && dotdir< 0.3 && ( d ) < 1.0 ){
			gl_FragColor.r *=  (d*0.5+ 0.5) ;
			gl_FragColor.g = (1.0-d)* 0.6 + gl_FragColor.g *((d)*0.6+0.4);
			gl_FragColor.b = (1.0-d)* 0.6 + gl_FragColor.b *((d)*0.6+0.4);
		} else if( (dotdir) > -0.01 && dotdir< 0.0 && ( d ) < 1.0 ){
			float d2 = d -dotdir * 30.0;
			if( d2 > 1.0 ) d2 = 1.0;
			gl_FragColor.r *=  (d2*0.5+ 0.5) ;
			gl_FragColor.g = (1.0-d2)* 0.6 + gl_FragColor.g *((d2)*0.6+0.4);
			gl_FragColor.b = (1.0-d2)* 0.6 + gl_FragColor.b *((d2)*0.6+0.4);
		} else if( (dotdir) > 0.3 && dotdir< 0.31 && ( d ) < 1.0 ){
			float d2 = d +(dotdir-0.3) * 30.0;
			if( d2 > 1.0 ) d2 = 1.0;
			gl_FragColor.r *=  (d2*0.5+ 0.5) ;
			gl_FragColor.g = (1.0-d2)* 0.6 + gl_FragColor.g *((d2)*0.6+0.4);
			gl_FragColor.b = (1.0-d2)* 0.6 + gl_FragColor.b *((d2)*0.6+0.4);
		}


        }

    }
    `
} );

/*
#if !MORE_ROUNDED
              g = sqrt((a*a+b*b)/2);
              h = pow(g,200.0) * 0.5;  // up to 600 even works...
              g = pow( ( max(a,b)),400);
              h = (g+h);
              gl_FragColor = vec4( h * in_Color.rgb, in_Color.a ) ;
#else
*/

}
