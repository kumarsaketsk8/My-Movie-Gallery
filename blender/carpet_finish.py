import bpy

scene = bpy.context.scene
rug = bpy.data.objects['Red carpet']
floor = bpy.data.objects['Wide floor']
bpy.context.view_layer.update()

# Resize the actual mesh—not only the object transform—so the carpet permanently spans the floor.
target_width = floor.dimensions.x
current_width = rug.dimensions.x
factor = target_width / current_width
for vertex in rug.data.vertices:
    vertex.co.x *= factor
rug.scale.x = 1.0
bpy.context.view_layer.update()

material = bpy.data.materials.get('Red carpet') or bpy.data.materials.new('Red carpet')
material.use_nodes = True
nodes = material.node_tree.nodes
nodes.clear()
output = nodes.new('ShaderNodeOutputMaterial')
bsdf = nodes.new('ShaderNodeBsdfPrincipled')
bsdf.inputs['Base Color'].default_value = (.22, .006, .004, 1)
bsdf.inputs['Roughness'].default_value = .92
bsdf.inputs['IOR'].default_value = 1.45
if 'Specular IOR Level' in bsdf.inputs:
    bsdf.inputs['Specular IOR Level'].default_value = .18
if 'Transmission Weight' in bsdf.inputs:
    bsdf.inputs['Transmission Weight'].default_value = 0.0
noise = nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value = 260
noise.inputs['Detail'].default_value = 3
noise.inputs['Roughness'].default_value = .7
bump = nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = .38
bump.inputs['Distance'].default_value = .035
links = material.node_tree.links
links.new(noise.outputs['Fac'], bump.inputs['Height'])
links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
rug.data.materials.clear()
rug.data.materials.append(material)

scene.render.filepath = '/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/plan_gallery_preview.png'
bpy.ops.wm.save_as_mainfile(filepath='/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/plan_gallery.blend')
bpy.ops.render.render(write_still=True)
print('Carpet width:', rug.dimensions.x, 'Floor width:', floor.dimensions.x)
