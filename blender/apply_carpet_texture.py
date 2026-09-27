import bpy

texture_path = '/var/folders/4c/8p58srcj6flg1v5lrgkl9z280000gp/T/codex-clipboard-5a9c3ebb-a995-4db3-bc06-d9bce4991a03.png'
scene = bpy.context.scene
carpet = bpy.data.objects['Red carpet - full gallery width']
material = bpy.data.materials['Red carpet']
material.use_nodes = True
nodes = material.node_tree.nodes
nodes.clear()
links = material.node_tree.links

out = nodes.new('ShaderNodeOutputMaterial')
bsdf = nodes.new('ShaderNodeBsdfPrincipled')
bsdf.inputs['Roughness'].default_value = .88
bsdf.inputs['IOR'].default_value = 1.45
if 'Specular IOR Level' in bsdf.inputs:
    bsdf.inputs['Specular IOR Level'].default_value = .16
if 'Transmission Weight' in bsdf.inputs:
    bsdf.inputs['Transmission Weight'].default_value = 0.0

texcoord = nodes.new('ShaderNodeTexCoord')
mapping = nodes.new('ShaderNodeMapping')
mapping.inputs['Scale'].default_value = (5.5, 10.0, 1.0)
image_node = nodes.new('ShaderNodeTexImage')
image = bpy.data.images.load(texture_path, check_existing=True)
image_node.image = image
image_node.interpolation = 'Linear'

color = nodes.new('ShaderNodeValToRGB')
color.color_ramp.elements[0].position = .18
color.color_ramp.elements[0].color = (.04, .0005, .0003, 1)
color.color_ramp.elements[1].position = .82
color.color_ramp.elements[1].color = (.55, .008, .004, 1)
bump = nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = .28
bump.inputs['Distance'].default_value = .018
links.new(texcoord.outputs['Generated'], mapping.inputs['Vector'])
links.new(mapping.outputs['Vector'], image_node.inputs['Vector'])
links.new(image_node.outputs['Color'], color.inputs['Fac'])
links.new(color.outputs['Color'], bsdf.inputs['Base Color'])
links.new(image_node.outputs['Color'], bump.inputs['Height'])
links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

# A slightly stronger but still warm overhead wash reveals pile detail without a glossy sheen.
for obj in scene.objects:
    if obj.name.startswith('Three row light') and obj.type == 'LIGHT':
        obj.data.energy = 210
for obj in scene.objects:
    if obj.name.startswith('Board spotlight') and obj.type == 'LIGHT':
        obj.data.energy = 820

carpet.data.materials.clear()
carpet.data.materials.append(material)
bpy.context.view_layer.update()
bpy.ops.file.pack_all()
scene.render.filepath = '/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/plan_gallery_preview.png'
bpy.ops.wm.save_as_mainfile(filepath='/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/plan_gallery.blend')
bpy.ops.render.render(write_still=True)
