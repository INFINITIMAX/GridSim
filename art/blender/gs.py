# GridSim art in Blender: shared helpers. Every build script starts with
#   exec(open(r"D:\GridSim\art\blender\gs.py", encoding="utf-8").read())
# Look: flat toon tones (three steps of light), an ink outline around every part, orthographic camera.

import math

import bmesh
import bpy
from mathutils import Vector

# ---------- Everything you might want to change lives here ----------

PALETTE = {
    "bg": "#e6eae8",
    "ink": "#1d2329",
    "grass": "#9db884",
    "grass_dark": "#6f9566",
    "earth": "#b8a084",
    "earth_mid": "#a78f74",
    "earth_deep": "#957e66",
    "water": "#3f86c4",
    "water_light": "#9cc8ea",
    "foam": "#f2f7fb",
    "concrete": "#cfd3cf",
    "concrete_dark": "#a9afab",
    "wall": "#ecebe5",
    "roof": "#4a5662",
    "steel": "#8d99a3",
    "steel_dark": "#5e6a74",
    "runner": "#e3a23b",
    "generator": "#2f6f9f",
    "trunk": "#7a5c45",
    "rock": "#a3a9a6",
    "glass": "#b9d7ec",
    "accent": "#e3a23b",
    "red": "#d4553f",
}
OUTLINE = 0.035  # m, ink line thickness
TONES = [(0.0, 0.68), (0.42, 0.86), (0.8, 1.0)]  # (light level, brightness): shade, mid, lit
AMBIENT = 0.15  # light from the sky, so shade is not black
SUN_FROM = (-0.37, -0.59, 0.73)  # direction towards the sun: tops lit, front faces mid, right faces in shade


def hex_rgb(h):
    h = h.lstrip("#")
    srgb = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    # Blender wants linear colour.
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb) + (1.0,)


# ---------- Materials ----------


def toon(name):
    """Flat toon material in palette colour `name`: Diffuse -> Shader to RGB -> constant ramp -> emission."""
    key = f"gs_{name}"
    m = bpy.data.materials.get(key)
    if m:
        return m
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    diff = nt.nodes.new("ShaderNodeBsdfDiffuse")
    diff.inputs["Color"].default_value = (1, 1, 1, 1)  # pure light level; the colour comes in after the ramp
    s2r = nt.nodes.new("ShaderNodeShaderToRGB")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    mix = nt.nodes.new("ShaderNodeMix")
    emit = nt.nodes.new("ShaderNodeEmission")
    ramp.color_ramp.interpolation = "CONSTANT"
    els = ramp.color_ramp.elements
    while len(els) > 1:
        els.remove(els[-1])
    els[0].position, els[0].color = TONES[0][0], (TONES[0][1],) * 3 + (1,)
    for pos, b in TONES[1:]:
        e = els.new(pos)
        e.color = (b,) * 3 + (1,)
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    mix.inputs[7].default_value = hex_rgb(PALETTE[name])  # B colour
    nt.links.new(diff.outputs[0], s2r.inputs[0])
    nt.links.new(s2r.outputs["Color"], ramp.inputs[0])
    nt.links.new(ramp.outputs["Color"], mix.inputs[6])  # A colour
    nt.links.new(mix.outputs[2], emit.inputs["Color"])
    nt.links.new(emit.outputs[0], out.inputs["Surface"])
    m.diffuse_color = hex_rgb(PALETTE[name])
    return m


def ink():
    m = bpy.data.materials.get("gs_ink")
    if m:
        return m
    m = bpy.data.materials.new("gs_ink")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = hex_rgb(PALETTE["ink"])
    nt.links.new(emit.outputs[0], out.inputs["Surface"])
    m.use_backface_culling = True
    m.use_backface_culling_shadow = True  # the outline shell must not shade the part it wraps
    m.diffuse_color = hex_rgb(PALETTE["ink"])
    return m


# ---------- Parts ----------

COLLECTION = "GridSim"


def coll():
    c = bpy.data.collections.get(COLLECTION)
    if not c:
        c = bpy.data.collections.new(COLLECTION)
        bpy.context.scene.collection.children.link(c)
    return c


def finish(obj, color, bevel=0.03, outline=True, smooth=True):
    """Give a fresh object its toon material, a bevel, smooth shading and the ink outline."""
    for c in obj.users_collection:
        c.objects.unlink(obj)
    coll().objects.link(obj)
    obj.data.materials.clear()
    obj.data.materials.append(toon(color))
    if bevel:
        b = obj.modifiers.new("bevel", "BEVEL")
        b.width = bevel
        b.segments = 3
        b.limit_method = "ANGLE"
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
        try:
            obj.modifiers.new("smooth", "SMOOTH_BY_ANGLE")
        except Exception:
            pass
    if outline:
        obj.data.materials.append(ink())
        s = obj.modifiers.new("outline", "SOLIDIFY")
        s.thickness = OUTLINE
        s.offset = 1.0
        s.use_flip_normals = True
        s.use_rim = False
        s.material_offset = 1
    return obj


def mesh_from_bmesh(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def box(name, size, at, color, bevel=0.03, rot=(0, 0, 0), outline=True):
    """Box of `size` (x, y, z) centred at `at`."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    obj = mesh_from_bmesh(name, bm)
    obj.location = at
    obj.rotation_euler = rot
    return finish(obj, color, bevel=min(bevel, min(size) * 0.45), outline=outline, smooth=False)


def cylinder(name, r, h, at, color, segments=32, bevel=0.015, rot=(0, 0, 0), r2=None, outline=True):
    """Cylinder (or cone when r2 is given) standing on z, centred at `at`."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=r, radius2=r if r2 is None else r2, depth=h)
    obj = mesh_from_bmesh(name, bm)
    obj.location = at
    obj.rotation_euler = rot
    return finish(obj, color, bevel=bevel, outline=outline)


def rod(name, a, b, r, color, segments=8, outline=False):
    """Thin cylinder from point a to point b."""
    a, b = Vector(a), Vector(b)
    obj = cylinder(name, r, (b - a).length, (a + b) / 2, color, segments=segments, bevel=0, outline=outline)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = (b - a).to_track_quat("Z", "Y")
    return obj


def sphere(name, r, at, color, subdiv=1, scale=(1, 1, 1), outline=True, smooth=False):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=r)
    obj = mesh_from_bmesh(name, bm)
    obj.location = at
    obj.scale = scale
    return finish(obj, color, bevel=0, outline=outline, smooth=smooth)


def tube(name, points, r, color, segments=20, outline=True):
    """Pipe along a smooth curve through `points`, converted to mesh."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(points) - 1)
    for bp, p in zip(sp.bezier_points, points):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    cu.bevel_depth = r
    cu.bevel_resolution = segments // 4
    cu.use_fill_caps = True
    obj = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    for o in bpy.context.selected_objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.active_object
    return finish(obj, color, bevel=0, outline=outline)


def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.materials):
        if m.name.startswith("gs_"):
            bpy.data.materials.remove(m)
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for d in list(block):
            if d.users == 0:
                block.remove(d)


def setup_world_and_light():
    """Background colour seen by the camera; only a little ambient light; one sun."""
    sc = bpy.context.scene
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    sc.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    seen = nt.nodes.new("ShaderNodeBackground")
    seen.inputs["Color"].default_value = hex_rgb(PALETTE["bg"])
    amb = nt.nodes.new("ShaderNodeBackground")
    amb.inputs["Color"].default_value = (1, 1, 1, 1)
    amb.inputs["Strength"].default_value = AMBIENT
    path = nt.nodes.new("ShaderNodeLightPath")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(path.outputs["Is Camera Ray"], mix.inputs[0])
    nt.links.new(amb.outputs[0], mix.inputs[1])
    nt.links.new(seen.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    sun = bpy.data.objects.get("Sun")
    if not sun:
        sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
        sc.collection.objects.link(sun)
    sun.data.energy = math.pi  # Blender divides sun light by pi; this gives a lit level of cos(angle)
    sun.data.angle = math.radians(4)
    sun.rotation_mode = "QUATERNION"
    sun.rotation_quaternion = (-Vector(SUN_FROM)).to_track_quat("-Z", "Y")
