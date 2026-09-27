import bpy

OUT_BLEND = '/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/plan_gallery.blend'
scene = bpy.context.scene

collection = bpy.data.collections.get('Walkthrough curtains')
if collection:
    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(collection)
else:
    for obj in list(bpy.data.objects):
        if obj.name.startswith('Walkthrough curtain'):
            bpy.data.objects.remove(obj, do_unlink=True)

for marker_name in ('Curtains closed', 'Curtains open'):
    marker = scene.timeline_markers.get(marker_name)
    if marker:
        scene.timeline_markers.remove(marker)

notes = bpy.data.texts.get('BLENDER_WALKTHROUGH_CONTROLS')
if notes:
    bpy.data.texts.remove(notes, do_unlink=True)

scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
