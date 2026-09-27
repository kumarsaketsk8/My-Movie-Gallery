import bpy
from mathutils import Vector

s = bpy.context.scene
for o in list(s.objects):
    if o.name.startswith(('Downlight', 'Three row light', 'Cylinder', 'Sphere', 'Velvet rope')):
        bpy.data.objects.remove(o, do_unlink=True)

for x in (-6, 0, 6):
    for y in range(2, 38, 3):
        bpy.ops.object.light_add(type='AREA', location=(x, y, 9.0))
        light = bpy.context.object
        light.name = 'Three row light'
        light.data.energy = 155
        light.data.shape = 'DISK'
        light.data.size = .42
        light.data.color = (1, .70, .42)

rug = bpy.data.objects.get('Red carpet')
if rug:
    rug.dimensions.x = 20.5

mat = bpy.data.materials.get('Empty board linen')
if mat:
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (.105, .006, .004, 1)
    bsdf.inputs['Roughness'].default_value = .80
    weave = nodes.new('ShaderNodeTexNoise')
    weave.inputs['Scale'].default_value = 180
    weave.inputs['Detail'].default_value = 2
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .30
    bump.inputs['Distance'].default_value = .045
    links = mat.node_tree.links
    links.new(weave.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

emitter = bpy.data.materials.new('Warm recessed emitter')
emitter.use_nodes = True
emitter.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (1, .55, .18, 1)
emitter.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = (1, .55, .18, 1)
emitter.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 5
for x in (-6, 0, 6):
    for y in range(2, 38, 3):
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=.20, depth=.035, location=(x, y, 9.10))
        disk = bpy.context.object
        disk.name = 'Three row light fixture'
        disk.data.materials.append(emitter)

s.render.filepath = '/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/plan_gallery_preview.png'
bpy.ops.wm.save_as_mainfile(filepath='/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/plan_gallery.blend')
bpy.ops.render.render(write_still=True)
