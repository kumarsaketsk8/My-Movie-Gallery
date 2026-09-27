import bpy

s = bpy.context.scene
floor = bpy.data.objects['Wide floor']
for obj in list(s.objects):
    if obj.name.startswith('Red carpet'):
        bpy.data.objects.remove(obj, do_unlink=True)

carpet_mat = bpy.data.materials['Red carpet']
bpy.ops.mesh.primitive_cube_add(location=(floor.location.x, floor.location.y, .025))
carpet = bpy.context.object
carpet.name = 'Red carpet - full gallery width'
carpet.dimensions = (floor.dimensions.x, floor.dimensions.y - .35, .07)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
carpet.data.materials.append(carpet_mat)

s.render.filepath = '/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/plan_gallery_preview.png'
bpy.ops.wm.save_as_mainfile(filepath='/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/plan_gallery.blend')
bpy.ops.render.render(write_still=True)
print('Full-width carpet:', carpet.dimensions[:])
