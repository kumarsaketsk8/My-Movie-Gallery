import bpy

# Browser-ready render of the path authored in plan_gallery.blend.  The camera,
# curtain meshes, timing, and all lighting remain in the .blend file; this
# script only chooses a compact delivery format for the gallery website.
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 960
scene.render.resolution_y = 600
scene.render.resolution_percentage = 100
scene.render.fps = 60
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 85
scene.render.filepath = '/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/plan_gallery_frames/frame_'

bpy.ops.render.render(animation=True)
