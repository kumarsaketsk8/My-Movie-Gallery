import bpy
import math
from mathutils import Vector

s = bpy.context.scene
s.render.fps = 60
s.frame_start = 1
intro_frames = 180
s.frame_end = intro_frames + 1200

# Keep the original hero camera intact; create a dedicated scroll-path camera.
old = bpy.data.objects.get('Color Museum Scroll Camera')
if old:
    bpy.data.objects.remove(old, do_unlink=True)
bpy.ops.object.camera_add(location=(0, -1, 1.6))
cam = bpy.context.object
cam.name = 'Color Museum Scroll Camera'
cam.data.name = 'Color Museum Scroll Camera Lens'
cam.data.lens = 36 / (2 * math.tan(math.radians(55) / 2))
cam.data.clip_start = .05
cam.data.clip_end = 120
s.camera = cam

# Exact implementation constants copied from the supplied analysis.
cam['interaction'] = 'vertical_scroll_only; no mouse-position parallax'
cam['wheel_multiplier'] = .9
cam['lenis_lerp'] = .075
cam['damping_rate_per_second'] = 4.5
cam['per_wall_viewport_heights'] = 2.6
cam['linger_weight'] = 1.6
cam['linger_center'] = .45
cam['linger_width'] = .07
cam['snap_delay_ms'] = 200
cam['snap_range_viewport_heights'] = .234
cam['idle_bob_amplitude'] = .004
cam['idle_bob_period_seconds'] = 4.6
cam['reduced_motion_disables_idle'] = True

def smoothstep(t):
    t = max(0, min(1, t))
    return 3*t*t - 2*t*t*t

def aim(location, target):
    return (Vector(target) - Vector(location)).to_track_quat('-Z', 'Y').to_euler()

cam.rotation_euler = aim(cam.location, (0, 6, 1.6))
for frame in (1, intro_frames):
    cam.keyframe_insert('location', frame=frame)
    cam.keyframe_insert('rotation_euler', frame=frame)

# One 4-second / 240-frame wall interval for every existing display board.
# The source's 7 -> 3.07 approach distance, 10% departure hold, and 5-unit
# alternating side arc are preserved; forward endpoints adapt to the existing
# board spacing so the gallery design is not moved.
boards = [6, 12, 18, 24, 30]
frames_per_wall = 240
for index, wall_y in enumerate(boards):
    next_start = (boards[index + 1] - 7) if index + 1 < len(boards) else wall_y + 5
    sign = 1 if index % 2 == 0 else -1
    start = intro_frames + index * frames_per_wall + 1
    for local in range(frames_per_wall + 1):
        r = local / frames_per_wall
        if r <= .45:
            q = smoothstep(r / .45)
            x = 0
            y = wall_y - 7 + (7 - 3.07) * q
            target = (0, wall_y, 1.6)
        else:
            a = (r - .45) / .55
            q = smoothstep((a - .10) / .90)
            x = sign * 5 * math.sin(math.pi * q)
            y = wall_y - 3.07 + (next_start - (wall_y - 3.07)) * q
            target = (sign * 1.5, wall_y + 2.5, 1.6)
        cam.location = (x, y, 1.6)
        cam.rotation_euler = aim(cam.location, target)
        frame = start + local
        cam.keyframe_insert('location', frame=frame)
        cam.keyframe_insert('rotation_euler', frame=frame)

for marker in list(s.timeline_markers):
    if marker.name.startswith('Approach ') or marker.name.startswith('Curtains '):
        s.timeline_markers.remove(marker)
for i, name in enumerate(['Approach 01', 'Approach 02', 'Approach 03', 'Approach 04', 'Approach 05']):
    s.timeline_markers.new(name, frame=intro_frames + 1 + i * frames_per_wall)

# Preserve the existing curtain meshes and their animation, stretching only
# their timing to match the slower camera introduction.
for object_name in ('Walkthrough curtain left', 'Walkthrough curtain right'):
    curtain = bpy.data.objects.get(object_name)
    action = curtain.animation_data.action if curtain and curtain.animation_data else None
    if not action:
        continue
    start, end = action.frame_range
    target_end = intro_frames
    if end > start and abs(end - target_end) > .01:
        scale = (target_end - start) / (end - start)
        # Blender 5 stores curves inside layered-action channel bags; the
        # fallback keeps the script compatible with older Blender versions.
        curves = action.fcurves if hasattr(action, 'fcurves') else [
            curve
            for layer in action.layers
            for strip in layer.strips
            for channel_bag in strip.channelbags
            for curve in channel_bag.fcurves
        ]
        for curve in curves:
            for point in curve.keyframe_points:
                point.co.x = start + (point.co.x - start) * scale
                point.handle_left.x = start + (point.handle_left.x - start) * scale
                point.handle_right.x = start + (point.handle_right.x - start) * scale
    curtain['opening_duration_seconds'] = round((target_end - 1) / s.render.fps, 2)

s.timeline_markers.new('Curtains closed', frame=1)
s.timeline_markers.new('Curtains open', frame=intro_frames)

notes = bpy.data.texts.get('COLOR_MUSEUM_SCROLL_INTEGRATION') or bpy.data.texts.new('COLOR_MUSEUM_SCROLL_INTEGRATION')
notes.clear()
notes.write('''This Blender action is a camera-path source for a scroll viewer.\n\nThe reference is scroll-driven, not mouse-position-driven. In a web viewer use:\nanimated += (target - animated) * (1 - exp(-4.5 * dt))\ntarget += 0.9 * wheel.deltaY\nper wall = 4.0 * viewportHeight\n\nCamera action: Color Museum Scroll Camera; 60 fps; 180-frame curtain reveal, then 240 frames per wall. The five-stop camera path ends at frame 1380.\nFOV 55; near 0.05; far 120. Custom properties on the camera retain the remaining exact interaction values.\n''')

bpy.ops.wm.save_as_mainfile(filepath='/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/plan_gallery.blend')
