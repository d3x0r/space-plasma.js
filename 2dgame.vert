
// threeJS automatically includes a bunch of junk before this line

    varying vec2 ex_texCoord;

    void main() {

        vec4 mvPosition = vec4( vec3( position ), 1.0 );
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        ex_texCoord = uv;

    }
	