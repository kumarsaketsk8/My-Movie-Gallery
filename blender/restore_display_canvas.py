import bpy

scene = bpy.context.scene

# The red linen boards are the poster canvases.  Preserve their model and
# material; only move the animated entrance curtains completely out of the
# hero view once they have opened.
for object_name, open_x, overshoot_x in (
    ('Walkthrough curtain left', -15.5, -15.8),
    ('Walkthrough curtain right', 15.5, 15.8),
):
    curtain = bpy.data.objects[object_name]
    action = curtain.animation_data.action
    curves = [
        curve
        for layer in action.layers
        for strip in layer.strips
        for channel_bag in strip.channelbags
        for curve in channel_bag.fcurves
    ]
    x_curve = next(curve for curve in curves if curve.data_path == 'location' and curve.array_index == 0)
    opening_keys = [point for point in x_curve.keyframe_points if point.co.x > 30]
    opening_keys[-2].co.y = overshoot_x
    opening_keys[-2].handle_left.y = overshoot_x
    opening_keys[-2].handle_right.y = overshoot_x
    opening_keys[-1].co.y = open_x
    opening_keys[-1].handle_left.y = open_x
    opening_keys[-1].handle_right.y = open_x

# Render the same clean board used in the supplied reference for the site.
scene.camera = bpy.data.objects['Plan Gallery Hero Camera']
scene.frame_set(180)
scene.render.resolution_x = 1280
scene.render.resolution_y = 800
scene.render.resolution_percentage = 75
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = '/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/webgl-gallery/public/plan-gallery-render.png'
bpy.ops.render.render(write_still=True)

bpy.ops.wm.save_as_mainfile(filepath='/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/plan_gallery.blend')
