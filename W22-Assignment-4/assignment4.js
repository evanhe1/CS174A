import { defs, tiny } from "./examples/common.js";

const {
  Vector,
  Vector3,
  vec,
  vec3,
  vec4,
  color,
  hex_color,
  Shader,
  Matrix,
  Mat4,
  Light,
  Shape,
  Material,
  Scene,
  Texture,
} = tiny;

const { Cube, Axis_Arrows, Textured_Phong } = defs;

export class Assignment4 extends Scene {
  /**
   *  **Base_scene** is a Scene that can be added to any display canvas.
   *  Setup the shapes, materials, camera, and lighting here.
   */
  constructor() {
    // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
    super();

    // TODO:  Create two cubes, including one with the default texture coordinates (from 0 to 1), and one with the modified
    //        texture coordinates as required for cube #2.  You can either do this by modifying the cube code or by modifying
    //        a cube instance's texture_coords after it is already created.
    this.shapes = {
      box_1: new Cube(),
      box_2: new Cube(),
      axis: new Axis_Arrows(),
    };
    console.log(this.shapes.box_1.arrays.texture_coord);

    // TODO:  Create the materials required to texture both cubes with the correct images and settings.
    //        Make each Material from the correct shader.  Phong_Shader will work initially, but when
    //        you get to requirements 6 and 7 you will need different ones.
    this.materials = {
      phong: new Material(new Texture_Rotate(), {
        color: hex_color("#ffffff"),
      }),
      texture_stars: new Material(new Texture_Rotate(), {
        color: hex_color("#000000"),
        ambient: 1,
        diffusivity: 0.1,
        specularity: 0.1,
        texture: new Texture("assets/stars.png", "NEAREST"),
      }),
      texture_earth: new Material(new Texture_Scroll_X(), {
        color: hex_color("#000000"),
        ambient: 1,
        diffusivity: 0.1,
        specularity: 0.1,
        texture: new Texture("assets/earth.gif", "LINEAR_MIPMAP_LINEAR"),
      }),
    };

    this.initial_camera_location = Mat4.look_at(
      vec3(0, 10, 20),
      vec3(0, 0, 0),
      vec3(0, 1, 0)
    );

    this.pause = false;
    this.pause_changed = false;
    this.total_pause_time = 0;
    this.pause_start = 0;
  }

  make_control_panel() {
    // TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
    this.key_triggered_button("Cube rotation", ["c"], () => {
      this.pause = !this.pause;
      this.pause_changed = true;
    });
  }

  display(context, program_state) {
    if (!context.scratchpad.controls) {
      this.children.push(
        (context.scratchpad.controls = new defs.Movement_Controls())
      );
      // Define the global camera and projection matrices, which are stored in program_state.
      program_state.set_camera(Mat4.translation(0, 0, -8));
    }

    program_state.projection_transform = Mat4.perspective(
      Math.PI / 4,
      context.width / context.height,
      1,
      100
    );

    const light_position = vec4(10, 10, 10, 1);
    program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

    let t = program_state.animation_time / 1000,
      dt = program_state.animation_delta_time / 1000;
    if (this.pause && this.pause_changed) {
      this.pause_start = t;
      this.pause_changed = false;
    } else if (!this.pause && this.pause_changed) {
      this.total_pause_time += t - this.pause_start;
      this.pause_changed = false;
    }
    let cur_time = this.pause
      ? this.pause_start - this.total_pause_time
      : t - this.total_pause_time;
    let angle_1 = (2 * Math.PI * cur_time) / 3;
    let angle_2 = Math.PI * cur_time;
    let model_transform = Mat4.identity();
    let cube_1_transform = Mat4.identity().times(
      Mat4.rotation(angle_1, 1, 0, 0).times(Mat4.translation(-2, 0, 0))
    );
    let cube_2_transform = Mat4.identity()
      .times(Mat4.translation(2, 0, 0))
      .times(Mat4.rotation(angle_2, 0, 1, 0));

    // TODO:  Draw the required boxes. Also update their stored matrices.
    /*
    this.shapes.axis.draw(
      context,
      program_state,
      model_transform,
      this.materials.phong.override({ color: hex_color("#ffff00") })
    );*/

    this.shapes.box_1.draw(
      context,
      program_state,
      cube_1_transform,
      this.materials.texture_stars
    );

    this.shapes.box_2.draw(
      context,
      program_state,
      cube_2_transform,
      this.materials.texture_earth
    );
  }
}

class Texture_Scroll_X extends Textured_Phong {
  // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
  fragment_glsl_code() {
    return (
      this.shared_glsl_code() +
      `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                // Sample the texture image in the correct place:
                mat4 t_matrix = mat4(
                    vec4(2, 0, 0, 0),
                    vec4(0, 2, 0, 0),
                    vec4(0, 0, 1, 0),
                    vec4(-1.0 * mod(animation_time, 1.0), 0, 0, 1)
                  );
                vec4 coord_temp = vec4(f_tex_coord, 0, 1);
                coord_temp += vec4(0, 0, 0, 1);
                coord_temp = t_matrix * coord_temp;
                vec2 coord_2d = vec2(coord_temp.x, coord_temp.y);
                vec4 tex_color = texture2D( texture, coord_2d);
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                float dist_x = abs(.5 - mod(coord_2d.x, 1.0));
                float dist_y = abs(.5 - mod(coord_2d.y, 1.0));
                if ((.25 <= dist_x && .35 >= dist_x && .35 >= dist_y) || (.25 <= dist_y && .35 >= dist_y && .35 >= dist_x))
                    tex_color = vec4(0, 0, 0, 1.0);
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `
    );
  }
}

class Texture_Rotate extends Textured_Phong {
  // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #7.
  fragment_glsl_code() {
    return (
      this.shared_glsl_code() +
      `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            void main(){
                // Sample the texture image in the correct place:
                mat4 r_matrix = mat4(
                    vec4(-cos(1.57079632679 * mod(animation_time, 4.0)), sin(1.57079632679 * mod(animation_time, 4.0)), 0, 0),
                    vec4(-sin(1.57079632679 * mod(animation_time, 4.0)), -cos(1.57079632679 * mod(animation_time, 4.0)), 0, 0),
                    vec4(0, 0, 1, 0),
                    vec4(0, 0, 0, 1)
                  );
                vec4 coord_temp = vec4(f_tex_coord, 0, 0);
                coord_temp -= vec4(.5, .5, 0, 0 );
                coord_temp = r_matrix * coord_temp;
                coord_temp += vec4(.5, .5, 0, 0 );
                vec2 coord_2d = vec2(coord_temp.x, coord_temp.y);
                vec4 tex_color = texture2D( texture, coord_2d);
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                float dist_x = abs(.5 - coord_2d.x);
                float dist_y = abs(.5 - coord_2d.y);
                if ((.25 <= dist_x && .35 >= dist_x && .35 >= dist_y) || (.25 <= dist_y && .35 >= dist_y && .35 >= dist_x))
                    tex_color = vec4(0, 0, 0, 1.0);
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `
    );
  }
}
