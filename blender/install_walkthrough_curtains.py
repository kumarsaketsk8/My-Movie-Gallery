import bpy

OUT_BLEND = '/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/plan_gallery.blend'
scene = bpy.context.scene
scene.render.fps = 60
scene.frame_start = 1
scene.frame_end = 900

# Keep all existing gallery architecture and boards exactly where they are.  The
# original scroll camera is the walkthrough camera; this script only adds the
# opening proscenium in front of the first board.
camera = bpy.data.objects.get('Color Museum Scroll Camera')
if not camera:
    raise RuntimeError('Color Museum Scroll Camera is missing.')
scene.camera = camera
camera['walkthrough_control'] = 'Map browser scroll progress to frames 1–780.'
camera['forward_keys'] = 'W or D advance; S or A retreat.'
camera['scroll_speed'] = 1.45

collection = bpy.data.collections.get('Walkthrough curtains')
if not collection:
    collection = bpy.data.collections.new('Walkthrough curtains')
    scene.collection.children.link(collection)

for obj in list(collection.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

material = bpy.data.materials.get('Walkthrough velvet curtain') or bpy.data.materials.new('Walkthrough velvet curtain')
material.use_nodes = True
nodes = material.node_tree.nodes
links = material.node_tree.links
bsdf = nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (0.22, 0.002, 0.009, 1)
bsdf.inputs['Roughness'].default_value = 0.92
noise = nodes.get('Curtain weave') or nodes.new('ShaderNodeTexNoise')
noise.name = 'Curtain weave'
noise.inputs['Scale'].default_value = 85
noise.inputs['Detail'].default_value = 4
ramp = nodes.get('Curtain weave tone') or nodes.new('ShaderNodeValToRGB')
ramp.name = 'Curtain weave tone'
ramp.color_ramp.elements[0].color = (0.045, 0.0003, 0.001, 1)
ramp.color_ramp.elements[1].color = (0.31, 0.004, 0.012, 1)
if not any(link.to_node == ramp for link in noise.outputs['Fac'].links):
    links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
if not any(link.to_node == bsdf for link in ramp.outputs['Color'].links):
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])

def cube(name, location, dimensions, parent=None, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for linked in list(obj.users_collection):
        linked.objects.unlink(obj)
    collection.objects.link(obj)
    obj.data.materials.append(material)
    if bevel:
        modifier = obj.modifiers.new('Soft velvet edge', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 3
    if parent:
        obj.parent = parent
    return obj

def curtain_panel(side):
    # At the closed pose the two leaves meet at x=0 and cover the first board.
    panel = cube(
        'Walkthrough curtain left' if side < 0 else 'Walkthrough curtain right',
        (side * 2.55, 2.55, 3.9), (5.1, 0.28, 7.2), bevel=0.12,
    )
    for index in range(7):
        local_x = -2.12 + index * 0.7
        fold = cube(
            f'Walkthrough curtain fold {side} {index}',
            (panel.location.x + local_x, 2.35, 3.9), (0.13, 0.13, 6.85), panel, 0.04,
        )
        fold.location = (local_x, -0.20, 0)
    return panel

left = curtain_panel(-1)
right = curtain_panel(1)

def key_panel(panel, closed_x, open_x):
    panel.location.x = closed_x
    panel.rotation_euler = (0, 0, 0)
    for frame in (1, 20):
        panel.keyframe_insert('location', index=0, frame=frame)
        panel.keyframe_insert('rotation_euler', index=2, frame=frame)

    # Symmetric outward pull, a soft wing overshoot, then a still open pose.
    panel.location.x = open_x * 1.045
    panel.rotation_euler.z = 0.075 if closed_x < 0 else -0.075
    panel.keyframe_insert('location', index=0, frame=102)
    panel.keyframe_insert('rotation_euler', index=2, frame=102)
    panel.location.x = open_x
    panel.rotation_euler.z = 0
    panel.keyframe_insert('location', index=0, frame=120)
    panel.keyframe_insert('rotation_euler', index=2, frame=120)

key_panel(left, -2.55, -8.05)
key_panel(right, 2.55, 8.05)

scene.timeline_markers.remove(scene.timeline_markers.get('Curtains closed')) if scene.timeline_markers.get('Curtains closed') else None
scene.timeline_markers.remove(scene.timeline_markers.get('Curtains open')) if scene.timeline_markers.get('Curtains open') else None
scene.timeline_markers.new('Curtains closed', frame=1)
scene.timeline_markers.new('Curtains open', frame=120)

notes = bpy.data.texts.get('BLENDER_WALKTHROUGH_CONTROLS') or bpy.data.texts.new('BLENDER_WALKTHROUGH_CONTROLS')
notes.clear()
notes.write('''Blender walkthrough setup\n\nScene camera: Color Museum Scroll Camera\nFrames 1–780: forward walkthrough through the existing five display-board positions.\nFrames 1–34: curtains stay closed.  Frames 34–126: curtains open.\nFor a browser viewer, map normalized scroll progress to this frame range; W/D advance and S/A retreat.\nThe existing gallery meshes were not moved or replaced. No web-only split-board geometry is used.\n''')

scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
