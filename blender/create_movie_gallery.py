import bpy
import math
from mathutils import Vector


OUT_BLEND = "/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/movie_gallery.blend"
OUT_RENDER = "/Users/saket.kumar/Documents/ChatGPT/My Movie Gallery/blender/movie_gallery_preview.png"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.materials, bpy.data.curves, bpy.data.meshes, bpy.data.lights, bpy.data.cameras):
        for block in datablocks:
            if block.users == 0:
                datablocks.remove(block)


def material(name, color, metallic=0.0, roughness=0.5, coat=0.0, emission=None, emission_strength=0.0, transmission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*color, 1)
    node.inputs["Metallic"].default_value = metallic
    node.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in node.inputs:
        node.inputs["Coat Weight"].default_value = coat
    if "Transmission Weight" in node.inputs:
        node.inputs["Transmission Weight"].default_value = transmission
        node.inputs["IOR"].default_value = 1.45
    if emission:
        node.inputs["Emission Color"].default_value = (*emission, 1)
        node.inputs["Emission Strength"].default_value = emission_strength
    return mat


def image_material(name, path, roughness=0.42):
    image = bpy.data.images.load(path, check_existing=True)
    image.pack()
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.interpolation = "Linear"
    links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def box(name, location, scale, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (scale[0] / 2, scale[1] / 2, scale[2] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("Soft edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
    return obj


def cylinder(name, location, radius, depth, mat, rotation=(0, 0, 0), vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def sphere(name, location, radius, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def plane(name, location, scale, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=2, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (scale[0] / 2, scale[1] / 2, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def rotate_uvs_clockwise(obj):
    """Keep portrait artwork upright on a plane rotated onto the side wall."""
    for polygon in obj.data.polygons:
        for loop_index in polygon.loop_indices:
            u, v = obj.data.uv_layers.active.data[loop_index].uv
            obj.data.uv_layers.active.data[loop_index].uv = (v, 1 - u)
    return obj


def rotate_uvs_counterclockwise(obj):
    """Counter-rotate landscape art mounted on the opposite side wall."""
    for polygon in obj.data.polygons:
        for loop_index in polygon.loop_indices:
            u, v = obj.data.uv_layers.active.data[loop_index].uv
            obj.data.uv_layers.active.data[loop_index].uv = (1 - v, u)
    return obj


def text(name, body, location, size, mat, rotation=(math.pi / 2, 0, 0), align="CENTER"):
    bpy.ops.object.text_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = align
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = 0.008
    obj.data.bevel_depth = 0.004
    obj.data.materials.append(mat)
    return obj


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def area_light(name, location, energy, size, color, target):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "RECTANGLE"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    point_at(obj, target)
    return obj


def spot_light(name, location, energy, color, target, blend=0.65, size=0.55):
    data = bpy.data.lights.new(name, "SPOT")
    data.energy = energy
    data.color = color
    data.spot_size = size
    data.spot_blend = blend
    data.shadow_soft_size = 0.25
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    point_at(obj, target)
    return obj


clear_scene()

# Materials: physically based, deliberately restrained to graphite, warm brass, theatrical red and cool LED blue.
black_wall = material("Charcoal acoustic wall", (0.012, 0.014, 0.017), metallic=0.08, roughness=0.66)
black_metal = material("Powder-coated black metal", (0.006, 0.008, 0.011), metallic=0.82, roughness=0.22, coat=0.35)
floor_mat = material("Polished graphite concrete", (0.035, 0.043, 0.055), metallic=0.56, roughness=0.2, coat=0.75)
carpet_mat = material("Low-pile velvet red carpet", (0.32, 0.001, 0.008), metallic=0.0, roughness=0.84)
carpet_bsdf = carpet_mat.node_tree.nodes.get("Principled BSDF")
noise = carpet_mat.node_tree.nodes.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 220
noise.inputs["Detail"].default_value = 1.0
noise.inputs["Roughness"].default_value = 0.2
coordinates = carpet_mat.node_tree.nodes.new("ShaderNodeTexCoord")
ramp = carpet_mat.node_tree.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position = 0.42
ramp.color_ramp.elements[0].color = (0.23, 0.0015, 0.005, 1)
ramp.color_ramp.elements[1].position = 0.58
ramp.color_ramp.elements[1].color = (0.31, 0.0025, 0.009, 1)
bump = carpet_mat.node_tree.nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.025
bump.inputs["Distance"].default_value = 0.006
carpet_mat.node_tree.links.new(coordinates.outputs["Generated"], noise.inputs["Vector"])
carpet_mat.node_tree.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
carpet_mat.node_tree.links.new(ramp.outputs["Color"], carpet_bsdf.inputs["Base Color"])
carpet_mat.node_tree.links.new(noise.outputs["Fac"], bump.inputs["Height"])
carpet_mat.node_tree.links.new(bump.outputs["Normal"], carpet_bsdf.inputs["Normal"])
brass = material("Aged brass", (0.43, 0.19, 0.04), metallic=0.91, roughness=0.24, coat=0.24)
warm_white = material("Marquee warm bulbs", (1.0, 0.52, 0.12), emission=(1.0, 0.38, 0.05), emission_strength=16)
marquee_white = material("Translucent marquee acrylic", (0.98, 0.91, 0.74), roughness=0.22, transmission=0.18, emission=(1.0, 0.54, 0.18), emission_strength=2.6)
poster_cream = material("Poster cream", (0.93, 0.73, 0.26), metallic=0.0, roughness=0.46)
poster_red = material("Poster scarlet", (0.59, 0.018, 0.03), metallic=0.0, roughness=0.36)
poster_blue = material("Poster cobalt", (0.025, 0.13, 0.43), metallic=0.04, roughness=0.38)
poster_teal = material("Poster teal", (0.02, 0.32, 0.32), metallic=0.0, roughness=0.44)
poster_pink = material("Poster hot pink", (0.92, 0.01, 0.22), metallic=0.0, roughness=0.32, emission=(0.32, 0.0, 0.03), emission_strength=0.3)
poster_yellow = material("Poster signal yellow", (1.0, 0.55, 0.01), metallic=0.0, roughness=0.34, emission=(0.36, 0.08, 0.0), emission_strength=0.25)
poster_violet = material("Poster electric violet", (0.25, 0.02, 0.62), metallic=0.0, roughness=0.34, emission=(0.06, 0.0, 0.2), emission_strength=0.3)
glass = material("Anti-reflective poster glass", (0.72, 0.83, 0.9), metallic=0.0, roughness=0.06, coat=0.85, transmission=0.32)
glass.diffuse_color = (0.72, 0.83, 0.9, 0.17)
led_dark = material("LED wall black", (0.004, 0.008, 0.016), metallic=0.45, roughness=0.24)
led_blue = material("LED blue", (0.02, 0.12, 0.45), emission=(0.02, 0.14, 1.0), emission_strength=7)
led_white = material("LED white", (0.65, 0.76, 1.0), emission=(0.36, 0.56, 1.0), emission_strength=9)
red_light = material("Carpet pool red", (0.65, 0.002, 0.015), emission=(1.0, 0.0, 0.01), emission_strength=3)
curtain_red = material("Theatre curtain velvet", (0.13, 0.0015, 0.006), metallic=0.0, roughness=0.96)
curtain_highlight = material("Theatre curtain fold", (0.23, 0.003, 0.011), metallic=0.0, roughness=0.91)
curtain_shadow = material("Theatre curtain fold shadow", (0.045, 0.0002, 0.001), metallic=0.0, roughness=1.0)
curtain_gold = material("Curtain gold trim", (0.52, 0.24, 0.035), metallic=0.84, roughness=0.25, emission=(0.28, 0.1, 0.01), emission_strength=0.25)
poster_backlight = material("Warm poster backlight", (0.52, 0.19, 0.025), metallic=0.0, roughness=0.42, emission=(1.0, 0.24, 0.035), emission_strength=2.2)

for curtain_material, dark, light in ((curtain_red, (0.04, 0.0002, 0.0008, 1), (0.17, 0.002, 0.007, 1)), (curtain_highlight, (0.07, 0.0005, 0.002, 1), (0.27, 0.006, 0.014, 1))):
    curtain_bsdf = curtain_material.node_tree.nodes.get("Principled BSDF")
    curtain_noise = curtain_material.node_tree.nodes.new("ShaderNodeTexNoise")
    curtain_noise.inputs["Scale"].default_value = 95
    curtain_noise.inputs["Detail"].default_value = 5.0
    curtain_noise.inputs["Roughness"].default_value = 0.78
    curtain_ramp = curtain_material.node_tree.nodes.new("ShaderNodeValToRGB")
    curtain_ramp.color_ramp.elements[0].color = dark
    curtain_ramp.color_ramp.elements[1].color = light
    curtain_bump = curtain_material.node_tree.nodes.new("ShaderNodeBump")
    curtain_bump.inputs["Strength"].default_value = 0.3
    curtain_bump.inputs["Distance"].default_value = 0.028
    curtain_material.node_tree.links.new(curtain_noise.outputs["Fac"], curtain_ramp.inputs["Fac"])
    curtain_material.node_tree.links.new(curtain_ramp.outputs["Color"], curtain_bsdf.inputs["Base Color"])
    curtain_material.node_tree.links.new(curtain_noise.outputs["Fac"], curtain_bump.inputs["Height"])
    curtain_material.node_tree.links.new(curtain_bump.outputs["Normal"], curtain_bsdf.inputs["Normal"])


def soft_light_pool_material():
    mat = bpy.data.materials.new("Soft carpet-light refraction")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    for node in nodes:
        nodes.remove(node)
    output = nodes.new("ShaderNodeOutputMaterial")
    mix = nodes.new("ShaderNodeMixShader")
    transparent = nodes.new("ShaderNodeBsdfTransparent")
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (1.0, 0.16, 0.06, 1)
    emission.inputs["Strength"].default_value = 0.42
    coordinates = nodes.new("ShaderNodeTexCoord")
    offset = nodes.new("ShaderNodeVectorMath")
    offset.operation = "SUBTRACT"
    offset.inputs[1].default_value = (0.5, 0.5, 0.0)
    distance = nodes.new("ShaderNodeVectorMath")
    distance.operation = "LENGTH"
    falloff = nodes.new("ShaderNodeValToRGB")
    falloff.color_ramp.elements[0].position = 0.0
    falloff.color_ramp.elements[0].color = (1, 1, 1, 1)
    falloff.color_ramp.elements[1].position = 0.72
    falloff.color_ramp.elements[1].color = (0, 0, 0, 1)
    links.new(coordinates.outputs["Generated"], offset.inputs[0])
    links.new(offset.outputs[0], distance.inputs[0])
    links.new(distance.outputs[1], falloff.inputs[0])
    links.new(falloff.outputs["Color"], mix.inputs[0])
    links.new(transparent.outputs[0], mix.inputs[1])
    links.new(emission.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], output.inputs["Surface"])
    if hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "DITHERED"
    return mat


soft_light = soft_light_pool_material()

# Architecture — 14m wide by 30m deep, open camera end, no human figures.
box("Polished gallery floor", (0, 8, -0.08), (14, 34, 0.16), floor_mat, 0.05)
box("Left acoustic wall", (-7.0, 8, 4.1), (0.22, 34, 8.2), black_wall)
box("Right acoustic wall", (7.0, 8, 4.1), (0.22, 34, 8.2), black_wall)
box("Gallery ceiling", (0, 8, 8.15), (14, 34, 0.18), black_wall)
box("Back exhibition wall", (0, 23.5, 4.1), (14, 0.24, 8.2), black_wall)
box("Red carpet", (0, 8.6, 0.025), (7.725, 30, 0.08), carpet_mat, 0.04)
for edge_x in (-3.93, 3.93):
    box("Brass carpet edging", (edge_x, 8.6, 0.073), (0.045, 30, 0.035), brass)

# Poster wall along the left, using the supplied portrait art in its intended upright orientation.
poster_data = [
    (3.0, "AFTER THE STORM", "/var/folders/4c/8p58srcj6flg1v5lrgkl9z280000gp/T/codex-clipboard-fc032ac3-6a48-40d0-bfe2-e53ea1879843.png"),
    (10.0, "SUPERMAN", "/var/folders/4c/8p58srcj6flg1v5lrgkl9z280000gp/T/codex-clipboard-a4053c2a-9083-47bb-bd45-f66e35d2b679.png"),
    (17.0, "LEMON TREE PASSAGE", "/var/folders/4c/8p58srcj6flg1v5lrgkl9z280000gp/T/codex-clipboard-8bee8624-f41b-40ff-9d6d-8383158083d0.png"),
]
for index, (y, label, image_path) in enumerate(poster_data):
    box(f"Poster backlight {index}", (-6.94, y, 3.7), (0.04, 3.25, 4.82), poster_backlight, 0.035)
    box(f"Poster frame {index}", (-6.82, y, 3.7), (0.24, 0.32, 4.5), black_metal, 0.025)
    portrait = plane(f"Framed portrait image {index}", (-6.685, y, 3.7), (4.08, 2.85), image_material(f"Packed portrait image {index}", image_path, 0.44), (0, math.pi / 2, 0))
    rotate_uvs_clockwise(portrait)
    box(f"Poster title band {index}", (-6.65, y, 2.35), (0.025, 2.45, 0.52), black_metal, 0.01)
    text(f"Poster title {index}", label, (-6.62, y, 2.35), 0.19, poster_cream, (math.pi / 2, 0, math.pi / 2))
    area_light(f"Poster backlight wash {index}", (-6.78, y, 3.7), 560, 3.4, (1.0, 0.22, 0.035), (-3.5, y, 3.7))
    spot_light(f"Poster spot {index}", (-5.3, y - 0.25, 7.72), 1250, (1.0, 0.68, 0.32), (-6.72, y, 3.7), blend=0.82, size=0.62)

# Right-wall hero artwork — landscape, uncropped, and occupying roughly half the wall.
right_art_y, right_art_z = 10.8, 4.1
box("Right artwork backlight", (6.91, right_art_y, right_art_z), (0.04, 8.75, 5.7), poster_backlight, 0.04)
box("Right artwork frame", (6.82, right_art_y, right_art_z), (0.22, 8.45, 5.4), black_metal, 0.035)
right_art = plane("Marilyn Monroe landscape artwork", (6.69, right_art_y, right_art_z), (5.05, 8.08), image_material("Packed Marilyn Monroe artwork", "/var/folders/4c/8p58srcj6flg1v5lrgkl9z280000gp/T/codex-clipboard-7cbc1d42-8c44-435a-9597-52b0650fb259.png", 0.38), (0, -math.pi / 2, 0))
rotate_uvs_counterclockwise(right_art)
area_light("Right artwork wash", (6.65, right_art_y, right_art_z), 740, 6.0, (0.82, 0.72, 0.58), (3.5, right_art_y, right_art_z))

# Grand marquee across the far entrance.
marquee_y, marquee_z = 18.2, 6.65
box("Marquee black cabinet", (0, marquee_y + 0.07, marquee_z), (8.5, 0.34, 2.35), black_metal, 0.05)
box("Marquee glowing face", (0, marquee_y - 0.12, marquee_z), (7.7, 0.05, 1.84), marquee_white, 0.02)
for z in (marquee_z - 0.42, marquee_z, marquee_z + 0.42):
    box("Marquee letter groove", (0, marquee_y - 0.16, z), (7.55, 0.03, 0.025), black_metal)
for x in [-3.92 + 0.42 * i for i in range(20)]:
    sphere("Marquee bulb", (x, marquee_y - 0.23, marquee_z + 0.98), 0.09, warm_white)
    sphere("Marquee bulb", (x, marquee_y - 0.23, marquee_z - 0.98), 0.09, warm_white)
for z in [-0.7 + 0.38 * i for i in range(5)]:
    sphere("Marquee bulb", (-4.04, marquee_y - 0.23, marquee_z + z), 0.09, warm_white)
    sphere("Marquee bulb", (4.04, marquee_y - 0.23, marquee_z + z), 0.09, warm_white)
area_light("Crisp marquee wash", (0, marquee_y - 1.2, marquee_z + 0.4), 820, 4.0, (1.0, 0.48, 0.13), (0, marquee_y + 2.0, 4.5))

# A layered proscenium curtain: central pleats, gathered wings, valance and gold tie-backs.
box("Curtain backing", (0, 23.25, 4.0), (11.9, 0.18, 7.5), curtain_red, 0.03)
for index in range(25):
    x = -4.9 + index * 0.408
    fold_depth = 0.16 if index % 2 else 0.055
    fold_height = 6.78 - (0.18 if index % 5 == 0 else 0)
    box("Curtain centre pleat", (x, 23.03 + fold_depth, 3.84), (0.19, 0.22, fold_height), curtain_highlight if index % 4 in (1, 2) else curtain_red, 0.055)
    box("Curtain pleat shadow seam", (x + 0.205, 22.99, 3.82), (0.075, 0.12, fold_height - 0.12), curtain_shadow, 0.025)
for side in (-1, 1):
    box("Curtain gathered wing", (side * 5.25, 22.98, 4.02), (1.55, 0.32, 7.14), curtain_red, 0.1)
    for offset in (-0.68, -0.48, -0.28, -0.08, 0.12, 0.32, 0.52, 0.72):
        box("Curtain wing fold", (side * (5.25 + offset), 22.78, 4.02), (0.105, 0.13, 6.9), curtain_highlight if int((offset + 1) * 10) % 2 else curtain_red, 0.045)
    cylinder("Curtain tieback", (side * 4.68, 22.72, 3.48), 0.085, 0.55, curtain_gold, rotation=(math.pi / 2, 0, 0), vertices=20)
    sphere("Curtain tassel", (side * 4.7, 22.7, 2.84), 0.12, curtain_gold)
box("Curtain valance", (0, 23.0, 7.48), (12.0, 0.30, 0.62), curtain_highlight, 0.09)
cylinder("Curtain gold pelmet", (0, 22.78, 7.2), 0.055, 11.25, curtain_gold, rotation=(0, math.pi / 2, 0), vertices=20)
for start_x in (-5.1, -2.55, 0.0, 2.55):
    curve = bpy.data.curves.new("Curtain scalloped gold trim", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.042
    curve.bevel_resolution = 4
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(2)
    for point, coordinate in zip(spline.bezier_points, ((start_x, 22.72, 7.08), (start_x + 1.275, 22.7, 6.7), (start_x + 2.55, 22.72, 7.08))):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    trim = bpy.data.objects.new("Curtain scalloped gold trim", curve)
    bpy.context.collection.objects.link(trim)
    trim.data.materials.append(curtain_gold)
area_light("Curtain glow", (0, 21.6, 4.0), 145, 6.4, (0.72, 0.025, 0.012), (0, 23.2, 3.8))

# Track lighting with visible hardware over the posters and the central route.
for x in (-4.6, 0, 4.6):
    cylinder("Ceiling track", (x, 10, 7.93), 0.055, 25, black_metal, rotation=(math.pi / 2, 0, 0), vertices=16)
    for y in (2.0, 6.0, 10.0, 14.0, 18.0):
        spot_light("Track spotlight", (x, y, 7.78), 420, (1.0, 0.58, 0.23), (x * 0.55, y + 0.65, 0.2), blend=0.9, size=0.56)

# Layered museum ceiling: exposed black grid beams, recessed lights, and alternating warm/cool downlight accents.
for y in (0.8, 4.0, 7.2, 10.4, 13.6, 16.8, 20.0):
    box("Ceiling cross beam", (0, y, 7.91), (13.7, 0.22, 0.22), black_metal, 0.02)
for x in (-5.8, -2.9, 2.9, 5.8):
    box("Ceiling longitudinal beam", (x, 10.4, 7.88), (0.18, 22.0, 0.18), black_metal, 0.02)
for y in (2.4, 5.6, 8.8, 12.0, 15.2, 18.4):
    for x in (-5.1, -1.55, 1.55, 5.1):
        cylinder("Recessed ceiling fixture", (x, y, 7.93), 0.12, 0.04, black_metal, rotation=(0, 0, 0), vertices=20)
        lens_mat = warm_white if (int(y * 10) + int(x * 10)) % 2 else led_blue
        cylinder("Recessed ceiling lens", (x, y, 7.9), 0.075, 0.042, lens_mat, rotation=(0, 0, 0), vertices=20)
        spot_light("Recessed ceiling cone", (x, y, 7.82), 270, (1.0, 0.42, 0.12) if lens_mat == warm_white else (0.14, 0.3, 1.0), (x * 0.62, y + 0.22, 0.0), blend=0.83, size=0.35)

# Darkened brass-and-velvet barrier runs farther from the carpet, with a woven rope finish.
barrier_brass = material("Dark aged barrier brass", (0.055, 0.014, 0.003), metallic=0.9, roughness=0.32, coat=0.18)
rope_mat = material("Fibred velvet stanchion rope", (0.13, 0.001, 0.006), roughness=0.9)
rope_bsdf = rope_mat.node_tree.nodes.get("Principled BSDF")
rope_noise = rope_mat.node_tree.nodes.new("ShaderNodeTexNoise")
rope_noise.inputs["Scale"].default_value = 145
rope_noise.inputs["Detail"].default_value = 3.2
rope_noise.inputs["Roughness"].default_value = 0.74
rope_ramp = rope_mat.node_tree.nodes.new("ShaderNodeValToRGB")
rope_ramp.color_ramp.elements[0].position = 0.28
rope_ramp.color_ramp.elements[0].color = (0.035, 0.0004, 0.0012, 1)
rope_ramp.color_ramp.elements[1].position = 0.7
rope_ramp.color_ramp.elements[1].color = (0.38, 0.004, 0.016, 1)
rope_bump = rope_mat.node_tree.nodes.new("ShaderNodeBump")
rope_bump.inputs["Strength"].default_value = 0.18
rope_bump.inputs["Distance"].default_value = 0.035
rope_mat.node_tree.links.new(rope_noise.outputs["Fac"], rope_ramp.inputs["Fac"])
rope_mat.node_tree.links.new(rope_ramp.outputs["Color"], rope_bsdf.inputs["Base Color"])
rope_mat.node_tree.links.new(rope_noise.outputs["Fac"], rope_bump.inputs["Height"])
rope_mat.node_tree.links.new(rope_bump.outputs["Normal"], rope_bsdf.inputs["Normal"])

def rope_between(name, start, end):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.028
    curve.bevel_resolution = 5
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(2)
    points = [start, ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2, min(start[2], end[2]) - 0.3), end]
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(rope_mat)

for side in (-1, 1):
    x = side * 4.78
    previous_y = 0.8
    for y in (0.8, 4.0, 7.2, 10.4, 13.6, 16.8, 20.0):
        cylinder("Barrier base shadow ring", (x, y, 0.046), 0.3, 0.028, black_metal)
        cylinder("Dark brass stanchion base", (x, y, 0.09), 0.22, 0.055, barrier_brass)
        cylinder("Brass base cap", (x, y, 0.14), 0.13, 0.04, brass)
        cylinder("Dark brass stanchion pole", (x, y, 0.98), 0.048, 1.7, barrier_brass)
        cylinder("Brass rope collar", (x, y, 1.78), 0.078, 0.075, brass)
        sphere("Dark brass stanchion finial", (x, y, 1.9), 0.1, barrier_brass)
        if y != 0.8:
            rope_between("Velvet rope", (x, previous_y, 1.82), (x, y, 1.82))
        previous_y = y

# Low, soft keys reveal the rope texture and give each barrier a faint contact shadow.
for side in (-1, 1):
    area_light("Barrier shadow key", (side * 4.9, 10.5, 3.5), 120, 3.2, (0.44, 0.12, 0.035), (side * 4.5, 10.5, 0.0))

# Soft, diffused light refractions down the carpet.
for y in (4.2, 7.4, 10.6, 13.8, 17.0):
    plane("Soft carpet light pool", (0, y, 0.086), (2.45, 0.86), soft_light)

# Side-wall display artefacts: reel and clapperboard only; the white display boxes are removed.
for side, y in ((-1, 17.0), (1, 3.0)):
    x = side * 6.78
    cylinder("Film reel", (x, y, 3.55), 0.58, 0.1, black_metal, rotation=(0, math.pi / 2, 0))
    for angle in range(0, 360, 72):
        a = math.radians(angle)
        sphere("Film reel opening", (x - side * 0.07, y + math.cos(a) * 0.32, 3.55 + math.sin(a) * 0.32), 0.11, black_wall)
for side, y in ((-1, 20.2), (1, 20.0)):
    x = side * 6.78
    box("Clapper slate", (x, y, 3.3), (0.1, 1.05, 0.7), black_metal, 0.015)
    box("Clapper striped hinge", (x - side * 0.06, y, 3.7), (0.11, 1.14, 0.13), poster_cream, 0.01)

# Camera and final cinematic lighting.
bpy.ops.object.camera_add(location=(0, -10.8, 3.15))
camera = bpy.context.object
camera.name = "Gallery hero camera"
camera.data.lens = 28
camera.data.sensor_width = 36
point_at(camera, (0, 12.3, 3.25))
bpy.context.scene.camera = camera
area_light("Entrance softbox", (0, -3.5, 6.8), 900, 6.0, (0.72, 0.42, 0.26), (0, 4, 1.4))
area_light("Right LED spill", (5.6, 10.5, 4.8), 640, 5.5, (0.12, 0.24, 1.0), (1.5, 10, 2.0))
area_light("Ceiling fill", (0, 12, 7.65), 750, 5.0, (1.0, 0.38, 0.18), (0, 12, 0.0))

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = OUT_RENDER
scene.render.film_transparent = False
scene.render.image_settings.color_depth = "16"
scene.render.resolution_percentage = 100
scene.world.color = (0.002, 0.003, 0.006)
scene.view_settings.look = "AgX - Medium High Contrast"

bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
bpy.ops.render.render(write_still=True)
