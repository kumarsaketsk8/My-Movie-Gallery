import bpy
from mathutils import Vector

scene = bpy.context.scene
camera = bpy.data.objects['Plan Gallery Hero Camera']
render_camera = camera.copy()
render_camera.data = camera.data.copy()
render_camera.animation_data_clear()
scene.collection.objects.link(render_camera)
scene.camera = render_camera
scene.render.resolution_x = 1280
scene.render.resolution_y = 800
scene.render.resolution_percentage = 75
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 84

for index, board_y in enumerate((6, 12, 18, 24, 30), start=1):
    # Render each existing display board from the same composed viewing distance.
    render_camera.location = (0, board_y - 7, 4.6)
    render_camera.rotation_euler = (Vector((0, board_y, 3.5)) - render_camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = f'/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/webgl-gallery/public/gallery-walk-{index}.jpg'
    bpy.ops.render.render(write_still=True)

scene.camera = camera
bpy.data.objects.remove(render_camera, do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath='/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/plan_gallery.blend')
