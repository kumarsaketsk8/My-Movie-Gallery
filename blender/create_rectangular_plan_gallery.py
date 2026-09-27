import bpy
import math
from mathutils import Vector

OUT_BLEND = '/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/rectangular_plan_gallery.blend'
OUT_RENDER = '/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/rectangular_plan_gallery_preview.png'
OUT_GLB = '/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/webgl-gallery/public/rectangular-plan-gallery.glb'

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.materials, bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
    for datablock in list(datablocks):
        datablocks.remove(datablock)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1600
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.render.image_settings.color_mode = 'RGBA'
scene.world.color = (0.004, 0.003, 0.004)
scene.view_settings.look = 'AgX - Medium High Contrast'

def material(name, color, metallic=0.0, roughness=0.5, emission=None, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = strength
    return mat

black = material('Charcoal architecture', (0.007, 0.006, 0.008), metallic=.25, roughness=.58)
wall = material('Warm black gallery wall', (0.025, 0.014, 0.012), metallic=.08, roughness=.7)
brass = material('Aged brass edge', (0.34, 0.12, 0.025), metallic=.88, roughness=.22)
light_mat = material('Warm recessed light', (1.0, .37, .06), roughness=.3, emission=(1.0, .28, .045), strength=8)

carpet = material('Red velvet carpet', (.28, .002, .006), roughness=.9)
nodes = carpet.node_tree.nodes
links = carpet.node_tree.links
bsdf = nodes.get('Principled BSDF')
noise = nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value = 145
noise.inputs['Detail'].default_value = 3.5
noise.inputs['Roughness'].default_value = .72
ramp = nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].color = (.10, .0004, .0015, 1)
ramp.color_ramp.elements[1].color = (.44, .006, .012, 1)
bump = nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = .22
bump.inputs['Distance'].default_value = .035
links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
links.new(noise.outputs['Fac'], bump.inputs['Height'])
links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])

board = material('Red display-board fabric', (.36, .004, .01), roughness=.84)
nodes = board.node_tree.nodes
links = board.node_tree.links
bsdf = nodes.get('Principled BSDF')
noise = nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value = 108
noise.inputs['Detail'].default_value = 5.5
noise.inputs['Roughness'].default_value = .76
ramp = nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].color = (.08, .0002, .001, 1)
ramp.color_ramp.elements[1].color = (.52, .012, .024, 1)
bump = nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = .3
bump.inputs['Distance'].default_value = .025
links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
links.new(noise.outputs['Fac'], bump.inputs['Height'])
links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])

curtain = material('Deep red velvet curtains', (.48, .001, .005), roughness=.95,
                   emission=(.10, .0001, .001), strength=.35)
nodes = curtain.node_tree.nodes
links = curtain.node_tree.links
bsdf = nodes.get('Principled BSDF')
noise = nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value = 46
noise.inputs['Detail'].default_value = 4.2
noise.inputs['Roughness'].default_value = .7
ramp = nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].color = (.028, .0001, .0003, 1)
ramp.color_ramp.elements[1].color = (.30, .003, .009, 1)
bump = nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = .42
bump.inputs['Distance'].default_value = .042
links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
links.new(noise.outputs['Fac'], bump.inputs['Height'])
links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])

exit_red = material('Luminous red wayfinding', (.72, .001, .003), metallic=.05, roughness=.25,
                    emission=(.78, .0005, .0015), strength=2.2)

def box(name, location, dimensions, mat, bevel=.04):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Soft edge', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
    return obj

def cylinder(name, location, radius, depth, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj

def area(name, location, energy, size, color, target):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.shape = 'DISK'
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    return obj

def display_board(name, location, width, depth, height, axis='x'):
    # Fabric boards are free-standing, with a narrow brass plinth; no posters are added.
    panel = box(name, location, (width, depth, height) if axis == 'x' else (depth, width, height), board, .09)
    # Keep the exact Blender board identity in the GLB so the web walkthrough can
    # assign posters in the curated, numbered route instead of by traversal order.
    panel['canvas_slot_name'] = name
    plinth = box(f'{name} brass plinth', (location[0], location[1], .17), (width + .34, depth + .25, .25) if axis == 'x' else (depth + .25, width + .34, .25), brass, .025)
    return panel, plinth

def doorway_treatment(name, center_x, opening_width, label, closed=False):
    """Create a theatre-like lintel, velvet curtains, and legible red signage."""
    lintel_z = 8.92
    lintel_h = 1.05
    y = -16.73
    box(f'{name} lintel', (center_x, y, lintel_z), (opening_width + .08, .56, lintel_h), black, .035)
    box(f'{name} lintel brass reveal', (center_x, -16.40, 8.43), (opening_width + .18, .06, .08), brass, .015)

    curtain_h = 7.72
    curtain_z = .22 + curtain_h / 2
    if closed:
        # A continuous velvet field, with rounded folds projecting toward the gallery,
        # reads as a physically gathered closed theatre curtain rather than a flat wall.
        box(f'{name} closed red velvet curtain', (center_x, -16.43, curtain_z),
            (opening_width - .10, .22, curtain_h), curtain, .10)
        box(f'{name} curtain valance', (center_x, -16.30, 7.85),
            (opening_width + .06, .34, .60), curtain, .09)
        fold_count = 19
        fold_span = opening_width - .38
        for index in range(fold_count):
            progress = index / (fold_count - 1)
            fold_x = center_x + (progress - .5) * fold_span
            # Alternate the depth slightly to give the pleats a natural, gathered rhythm.
            fold_y = -16.23 if index % 2 == 0 else -16.29
            fold = cylinder(f'{name} closed curtain fold {index + 1}',
                            (fold_x, fold_y, curtain_z), .115, curtain_h, curtain)
            for polygon in fold.data.polygons:
                polygon.use_smooth = True
    else:
        # Keep the entry drapes parted, so the established entrance composition remains open.
        panel_w = opening_width * .22
        for side in (-1, 1):
            panel_x = center_x + side * (opening_width / 2 - panel_w / 2)
            box(f'{name} curtain {"left" if side < 0 else "right"}', (panel_x, -16.41, curtain_z),
                (panel_w, .20, curtain_h), curtain, .075)
            for fold in (-.31, -.10, .10, .31):
                fold = cylinder(f'{name} curtain fold {side} {fold}',
                                (panel_x + fold * panel_w, -16.27, curtain_z), .065, curtain_h, curtain)
                for polygon in fold.data.polygons:
                    polygon.use_smooth = True

    sign_w = min(3.1, opening_width * .62)
    box(f'{name} sign housing', (center_x, -16.39, 8.89), (sign_w, .075, .70), black, .025)
    # Lit red border, built as actual geometry so it exports reliably to the web preview.
    border_y = -16.335
    for edge, loc, dims in (
        ('top', (center_x, border_y, 9.215), (sign_w, .028, .045)),
        ('bottom', (center_x, border_y, 8.565), (sign_w, .028, .045)),
        ('left', (center_x - sign_w / 2 + .023, border_y, 8.89), (.045, .028, .70)),
        ('right', (center_x + sign_w / 2 - .023, border_y, 8.89), (.045, .028, .70)),
    ):
        box(f'{name} sign border {edge}', loc, dims, exit_red, .005)

    font = bpy.data.curves.new(f'{name} {label} lettering', 'FONT')
    font.body = label
    font.align_x = 'CENTER'
    font.align_y = 'CENTER'
    font.size = .72 if label == 'EXIT' else .57
    font.extrude = .018
    font.bevel_depth = .007
    font.resolution_u = 8
    text = bpy.data.objects.new(f'{name} luminous {label} sign', font)
    bpy.context.collection.objects.link(text)
    text.location = (center_x, -16.29, 8.89)
    # Face into the gallery while keeping the text upright to a viewer approaching from inside.
    text.rotation_euler = (math.pi / 2, 0, math.pi)
    font.materials.append(exit_red)

    # Convert the lettering before GLB export; this keeps the glow readable in Three.js.
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = text
    text.select_set(True)
    bpy.ops.object.convert(target='MESH')
    text.name = f'{name} luminous {label} sign'

# Large rectangular shell. Entry is the lower-left doorway; exit is lower-right.
room_w, room_d, wall_h = 28, 34, 9.6
box('Red carpet floor', (0, 0, 0), (room_w, room_d, .16), carpet, .02)
box('Ceiling slab', (0, 0, wall_h), (room_w, room_d, .18), black, .015)
box('West exterior wall', (-14, 0, wall_h / 2), (.48, room_d, wall_h), wall)
box('East exterior wall', (14, 0, wall_h / 2), (.48, room_d, wall_h), wall)
box('North exterior wall', (0, 17, wall_h / 2), (room_w, .48, wall_h), wall)
box('South wall - entry side', (-10.0, -17, wall_h / 2), (8.0, .48, wall_h), wall)
box('South wall - centre', (0.0, -17, wall_h / 2), (3.0, .48, wall_h), wall)
box('South wall - exit side', (11.0, -17, wall_h / 2), (6.0, .48, wall_h), wall)
doorway_treatment('Entry', -3.75, 4.5, 'ENTER')
doorway_treatment('Exit', 4.75, 6.5, 'EXIT', closed=True)

# Keep the perimeter closed, but pull the central partition down from the ceiling.
# Its 10% height reduction creates a continuous visual opening above the T-shaped wall.
partition_h = wall_h * .90
partition_z = partition_h / 2

# The shorter cross wall deliberately widens the two circulation aisles either side,
# matching the revised plan instead of constricting movement near the centre.
box('Central cross wall', (0, 6.6, partition_z), (12.8, .48, partition_h), wall)
box('Central divider wall', (0, -4.95, partition_z), (.48, 23.4, partition_h), wall)

# Perimeter red boards as shown in the plan.
for index, x in enumerate((-9.2, -3.1, 3.1, 9.2)):
    display_board(f'North board {index + 1}', (x, 15.25, 3.35), 4.55, .32, 6.25)
for side, x in (('West', -12.7), ('East', 12.7)):
    for index, y in enumerate((-10.2, -2.0, 7.2)):
        display_board(f'{side} board {index + 1}', (x, y, 3.35), 5.4, .32, 6.25, axis='y')

# Follow the revised display plan at the central T: one board on the north face,
# two on the south face, plus one board along the entry-facing divider.
display_board('Cross-wall north board', (0, 8.05, 3.35), 4.0, .32, 6.25)
for index, x in enumerate((-3.6, 3.6)):
    display_board(f'Cross-wall south board {index + 1}', (x, 5.1, 3.35), 3.45, .32, 6.25)
# The divider has a dedicated display face on each side.  They are two separately
# addressable canvases in the numbered visitor route (3 and 14), not one shared slot.
display_board('Divider board west', (-.72, -4.3, 3.35), 5.5, .28, 6.25, axis='y')
display_board('Divider board east', (.72, -4.3, 3.35), 5.5, .28, 6.25, axis='y')

# Ceiling grid and three warm downlight rows, retaining the reference's theatre mood.
for y in range(-15, 17, 3):
    box(f'Ceiling cross beam {y}', (0, y, 9.3), (27.3, .18, .22), black, .01)
for x in (-9.0, -3.0, 3.0, 9.0):
    box(f'Ceiling length beam {x}', (x, 0, 9.28), (.18, 33.2, .22), black, .01)
for y in (-13, -9, -5, -1, 3, 7, 11, 15):
    for x in (-7.5, 0, 7.5):
        cylinder(f'Recessed light trim {x} {y}', (x, y, 9.16), .26, .06, black)
        cylinder(f'Recessed light {x} {y}', (x, y, 9.12), .16, .065, light_mat)
        area(f'Warm pool {x} {y}', (x, y, 8.95), 230, 2.2, (1.0, .38, .12), (x, y, .1))

# Gentle warm wall washes make the red fabric legible while retaining dark side aisles.
for x in (-12.5, 12.5):
    for y in (-10, 0, 10):
        area(f'Wall wash {x} {y}', (x * .98, y, 6.8), 190, 3.0, (1.0, .15, .05), (x * .82, y, 3.2))
area('Entry fill', (-4, -13.2, 6.4), 380, 4.0, (1.0, .25, .08), (-4, -3, 1.5))

# Entrance camera follows the green entry arrow from the plan, toward the north.
bpy.ops.object.camera_add(location=(-4.0, -15.3, 3.1))
camera = bpy.context.object
camera.name = 'Rectangular Gallery Entry Camera'
camera.data.lens = 28
camera.data.clip_start = .05
camera.data.clip_end = 150
camera.rotation_euler = (Vector((-2.8, -1.0, 3.0)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera = camera

scene.render.filepath = OUT_RENDER
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
bpy.ops.render.render(write_still=True)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', export_apply=True, export_extras=True)
