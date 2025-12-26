

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
			float icon_w = 1.0/29.0;
			float icon_h = 1.0/29.0;
		float iconx = 2.0*32.0;
		float icony = 2.0*32.0; 
		
		// should be about 1/2 of a 'pixel' at 16... 
		float iconscale = 32.0; // how big the icon area is

		// 512, 256 should be a pixel scalar, 
		//   they determine the visible area in pixels		
		float herex = x*iconscale/4.0+( ex_texCoord.x )*512.0-256.0;  // left to right 0-1.0
		float herey = (-y*iconscale/4.0+( ex_texCoord.y )*512.0-256.0);  // top to bottom 0-1.0 

		float pixelx = ( ex_texCoord.x );  // left to right 0-1.0
		float pixely = ( ex_texCoord.y );  // top to bottom 0-1.0 

		float iconpixelx;
		float iconpixely;

		if( abs(herex - iconx)  < iconscale/2.0 && abs(herey - icony ) < iconscale/2.0 ) {
			iconpixelx = ((herex - iconx)/iconscale +0.5) * icon_w ; 
			iconpixely = (0.5-(herey - icony)/iconscale )* icon_h ;
		}
		else {
			iconpixelx = 0.0;
			iconpixely = 0.0;
		}

		
		// x/y  position is -1024 to 1024
		float x1 = (x)/2048.0;  // -0.5 to 0.5
		float y1 = -(y)/2048.0;  // -0.5 to 0.5  (Vertical inverted)

		// pixel is biased to -0.5 to 0.5, scaled 
		// position is natural.
		
		// a smaller number makes for higher resolution...
		realuv.x = 0.5 + ((pixelx-0.5) / 32.0)  + x1;
		realuv.y = 0.5 + ((pixely-0.5) / 32.0)  + y1;
		
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
			
			// how far to step, otherwise radial limits are choppy
			float xdel = ( toHerex ) * 1.0/2048.0/4.0;
			float ydel = ( toHerey ) * 1.0/2048.0/4.0;


		vec2 temp = farxy - toHerexy;
			//float a = 0.0;
			float sum = 0.0;
			float priorDel = 0.0;
			float lastAngle ;
			if( scale > 0.0 ) {
				float nf ;
				for( int n = 0; n < 200; n ++ ) {
					nf = float(n)/1.0;
					vec2 pt = vec2( xdel*	nf, ydel*nf );
					if( length(pt) < (hereLen/32.0) ) 
					{
						vec2 pt2 = vec2( 0.5+pt.x+x1, 0.5+pt.y+y1);
						vec4 color = vec4(  texture2D( map_ul, pt2 ).rgb, 1.0 );
						float val = (color.r*128.0*128.0 + color.g*128.0 + color.b)/(128.0*128.0/2.0);

						// this inverted the field angle... so now we're look backwards...
						float fieldAngle = mod( (val*3.14159*8.0),(2.0*3.14159268));
						float xa1 = sin(fieldAngle);
						float ya1 = cos(fieldAngle );
						float dot = ( toHerex * xa1 + toHerey * ya1 );
						
						if( (dot) < 0.0 ) {
							if( priorDel >= 0.0 ) {
								priorDel = dot;
								lastAngle = val;
							}
							sum += dot ;
						} else ;//sum =0.0;
					
						if( sum < -1.0) {
							break;
						}
					}
				}
			}
			if( sum < -0.5 ) {
				a = lastAngle;
			}

			float b = sin(a*3.14159*8.0);
			float c = cos(a*3.14159*8.0);
			float dot = b*toHerex+c*toHerey;
				 
			float here_angle = acos( toHerey );
			if( toHerex < 0.0 ) here_angle = -here_angle;


			//float dot_angle = (	acos( dot ))/(3.1415968);
			float dot2 = b*dirx + c*diry;
			float angle2 = (	acos( dot2 ))/(3.1415968);


	// ===================  primary calculation of red/green paths.
			
			float fieldAngle = mod( (a*3.14159*8.0),(2.0*3.14159268))-(3.14159268);

			//float lookField = (mod(fieldAngle - angle + 2.0*3.145269, 2.0*3.14159268 ) -3.14159268 ) /3.14159268;

		// tests base offset amount... 
		//float delangle = (3.14159268 -mod(here_angle - angle + 3.0*3.145269, 2.0*3.14159268 ) )/3.14159268;
		float delangle = (mod(here_angle - fieldAngle + 2.0*3.145269, 2.0*3.14159268 ) - 3.14159268  )/3.14159268;
		                //delangle = fieldAngle;


			if( delangle < 0.0 ) {
			    	gl_FragColor = vec4(-delangle,0.2+0.4*dot,0.0,1.0);
			} else {
				if( dot > 0.0 ) 
				    	gl_FragColor = vec4(0.0, 0.2+0.4*dot, delangle,1.0);
			}


			if( dot < 0.0 ) {
				if( dot < -0.5 ) 
				    	gl_FragColor = vec4(0.5+0.4*dot,0.0,0.0,1.0);
				else
				    	gl_FragColor = vec4(0.5+0.4*dot,0.0,0.0,1.0);
			} else {
					
			    		gl_FragColor = gl_FragColor+vec4(0.0,0.2+0.4*dot,  0.0,0.0);
			}
//return;

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

	// X is -0.5 to 0.5  vs real X1
	float valx = (p1.r + p1.g/128.0 + p1.b/(128.0*128.0))/(1.0/2.0)-0.5 ;

	// Y is -0.5 to 0.5
	float valy = (p2.r + p2.g/128.0 + p2.b/(128.0*128.0))/(1.0/2.0)-0.5;


	// type
	float valt = (p3.b*256.0*256.0*256.0 + p3.g*256.0*256.0 + p3.r*256.0);

	// target/texture x/y this is where the icon is on the page... 
	float t_y = (trunc(valt /29.0 )-1.0) *icon_h;
	float t_x = trunc(mod(valt, 29.0)-4.0) * icon_w;


	// this is sort of how big the icon can draw... 
	float delx = (herex+valx )  ;
	float dely = (herey -valy + (y1))  ;

	if( abs( delx ) < 32.0 ) gl_FragColor.b=1.0;
	
	if( abs( dely ) < 32.0 ) gl_FragColor.g=1.0;


		// think this is how big the icon data is read... 
		float iconZoom = 1.0;

		//realuv3.x = (x1 + pixelx-0.5) / iconZoom + t_x ;
		//realuv3.y = (y1 +0.5 - pixely) / iconZoom + t_y ;
		realuv3.x = iconpixelx + t_x;//(x1 + pixelx-0.5) / iconZoom + t_x ;
		realuv3.y = iconpixely + t_y;//(y1 +0.5 - pixely) / iconZoom + t_y ;


		vec4 p4 = texture2D( icons, realuv3 );
		if( p4.a < 0.01 ) return;

		// center x of icon... 
	
		//if( p4.a > 0.0 )
		gl_FragColor = (1.0-p4.a)*gl_FragColor + p4.a*p4;
		gl_FragColor.a = 1.0;
	
	}


// ---------- This bit modifies the color for the direction indicator
	float d = abs( toHerexy.x * farxy.y/farxy.x - toHerexy.y ) / sqrt( 1.0+(farxy.y*farxy.y)/(farxy.x*farxy.x) );
	d=d/0.01;
	vec2 dottmp = toHerexy*farxy;
	float dotdir = dottmp.x+dottmp.y;

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