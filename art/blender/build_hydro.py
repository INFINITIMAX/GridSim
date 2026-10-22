# GridSim art: the micro hydro diorama. Run inside Blender (via MCP):
#   exec(open(r"D:\GridSim\art\blender\build_hydro.py", encoding="utf-8").read())
# Axes: x downstream, y away from the viewer (the near bank is y < 0), z up. Ground top is z = 0.

exec(open(r"D:\GridSim\art\blender\gs.py", encoding="utf-8").read())

import random

random.seed(7)

# ---------- Layout ----------

SLAB = {"x0": -6.6, "x1": 6.6, "y0": -4.3, "y1": 4.3}
CH = {"y0": -0.85, "y1": 0.85, "bed": -0.8}  # river channel
LAYERS = [(-1.7, -1.05, "earth_deep"), (-1.05, -0.55, "earth_mid"), (-0.55, -0.26, "earth"), (-0.26, 0.0, "grass")]
DAM_X = -2.6
WATER_UP = -0.07
WATER_DOWN = -0.45
PH = {"x0": 1.7, "x1": 3.9, "y0": -3.15, "y1": -1.25, "h": 1.6}  # powerhouse
TX, TY = 2.95, -2.15  # turbine axis
TR = (5.15, -2.55)  # transformer
PY = (5.7, 2.0, 2.9)  # on the far bank: the line crosses the river  # pylon x, y, height

clear_scene()
setup_world_and_light()

# ---------- Land ----------

for y0, y1 in ((SLAB["y0"], CH["y0"]), (CH["y1"], SLAB["y1"])):
    for z0, z1, colour in LAYERS:
        box(f"land_{colour}_{y0:+.0f}", (SLAB["x1"] - SLAB["x0"], y1 - y0, z1 - z0), (0, (y0 + y1) / 2, (z0 + z1) / 2), colour, bevel=0.07)
for z0, z1, colour in LAYERS[:2]:
    box(f"bed_{colour}", (SLAB["x1"] - SLAB["x0"], CH["y1"] - CH["y0"], min(z1, CH["bed"]) - z0), (0, 0, (z0 + min(z1, CH["bed"])) / 2), colour, bevel=0.05)


def water(name, x0, x1, z, y0=CH["y0"] + 0.01, y1=CH["y1"] - 0.01):
    return box(name, (x1 - x0, y1 - y0, z - CH["bed"]), ((x0 + x1) / 2, (y0 + y1) / 2, (z + CH["bed"]) / 2), "water", bevel=0.0, outline=False)


water("water_up", SLAB["x0"] + 0.02, DAM_X, WATER_UP)
water("water_down", DAM_X, SLAB["x1"] - 0.02, WATER_DOWN)
# Ripples: short light strokes along the flow.
for i in range(16):
    up = i < 6
    x = random.uniform(SLAB["x0"] + 0.5, DAM_X - 0.4) if up else random.uniform(DAM_X + 1.2, SLAB["x1"] - 0.5)
    y = random.uniform(CH["y0"] + 0.2, CH["y1"] - 0.2)
    z = (WATER_UP if up else WATER_DOWN) + 0.005
    box(f"ripple_{i}", (random.uniform(0.4, 1.0), 0.045, 0.01), (x, y, z), "water_light", bevel=0, outline=False)
# Stones along both banks of the channel.
for i in range(26):
    x = random.uniform(SLAB["x0"] + 0.3, SLAB["x1"] - 0.3)
    if abs(x - DAM_X) < 0.7:
        continue
    side = random.choice((-1, 1))
    r = random.uniform(0.07, 0.15)
    z = (WATER_UP if x < DAM_X else WATER_DOWN) + r * 0.2
    s = sphere(f"stone_{i}", r, (x, side * (CH["y1"] - r * 0.6), z), "rock", subdiv=1, scale=(1.3, 1, 0.7))
    s.rotation_euler = (0, 0, random.uniform(0, 3))

# ---------- Dam ----------

# Body: vertical upstream face, sloping downstream face.
bm = bmesh.new()
w_top, w_bot, z_bot, z_top = 0.45, 1.1, CH["bed"], 0.32
y0, y1 = CH["y0"] - 0.35, CH["y1"] + 0.35
prof = [(DAM_X - w_top / 2, z_bot), (DAM_X - w_top / 2 + w_bot, z_bot), (DAM_X + w_top / 2, z_top), (DAM_X - w_top / 2, z_top)]
front = [bm.verts.new((x, y0, z)) for x, z in prof]
back = [bm.verts.new((x, y1, z)) for x, z in prof]
bm.faces.new(front[::-1])
bm.faces.new(back)
for i in range(4):
    j = (i + 1) % 4
    bm.faces.new((front[i], front[j], back[j], back[i]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
finish(mesh_from_bmesh("dam", bm), "concrete", bevel=0.03, smooth=False)
# Walkway and railing.
box("dam_walk", (0.7, y1 - y0 + 0.3, 0.1), (DAM_X, 0, z_top + 0.05), "concrete_dark", bevel=0.03)
for side in (-1, 1):
    xr = DAM_X + side * 0.3
    for k in range(9):
        yk = y0 - 0.1 + k * (y1 - y0 + 0.2) / 8
        rod(f"rail_post_{side}_{k}", (xr, yk, z_top + 0.1), (xr, yk, z_top + 0.36), 0.014, "ink")
    rod(f"rail_top_{side}", (xr, y0 - 0.1, z_top + 0.36), (xr, y1 + 0.1, z_top + 0.36), 0.014, "ink")
    rod(f"rail_mid_{side}", (xr, y0 - 0.1, z_top + 0.23), (xr, y1 + 0.1, z_top + 0.23), 0.01, "ink")
# Spillway: water pouring over the downstream face, foam at the foot.
sheet = box("spill_sheet", (0.9, 0.9, 0.03), (DAM_X + 0.38, 0.25, (WATER_UP + WATER_DOWN) / 2 + 0.05), "water_light", bevel=0, outline=False)
sheet.rotation_euler = (0, math.atan2(z_top - z_bot, w_bot - w_top), 0)
for i in range(9):
    sphere(f"foam_{i}", random.uniform(0.08, 0.14), (DAM_X + 0.75 + random.uniform(-0.05, 0.25), random.uniform(-0.25, 0.75), WATER_DOWN + 0.02), "foam", subdiv=1, scale=(1, 1, 0.45), outline=False)

# Intake on the near bank: housing, trash rack bars and a gate wheel.
IN = (DAM_X - 0.05, CH["y0"] - 0.65)
box("intake_house", (0.7, 0.6, 0.55), (IN[0], IN[1], 0.27), "concrete", bevel=0.04)
box("intake_roof", (0.8, 0.7, 0.08), (IN[0], IN[1], 0.59), "roof", bevel=0.03)
for k in range(6):
    rod(f"rack_bar_{k}", (IN[0] - 0.36, IN[1] - 0.2 + k * 0.08, 0.02), (IN[0] - 0.36, IN[1] - 0.2 + k * 0.08, 0.42), 0.012, "steel_dark")
bpy.ops.mesh.primitive_torus_add(major_radius=0.12, minor_radius=0.02, location=(IN[0], IN[1] - 0.32, 0.4), rotation=(math.pi / 2, 0, 0))
finish(bpy.context.active_object, "red", bevel=0)

# ---------- Penstock ----------

pen_pts = [(IN[0] + 0.3, IN[1], 0.2), (-1.2, -1.75, 0.22), (0.4, -2.05, 0.22), (PH["x0"] - 0.05, TY, 0.22)]
tube("penstock", pen_pts, 0.16, "steel")
for k, t in enumerate((0.12, 0.3, 0.5, 0.7, 0.88)):
    # Points along the polyline, close enough to the smooth curve for flanges and saddles.
    seg = t * (len(pen_pts) - 1)
    i = min(int(seg), len(pen_pts) - 2)
    a, b = Vector(pen_pts[i]), Vector(pen_pts[i + 1])
    p = a.lerp(b, seg - i)
    d = (b - a).normalized()
    bpy.ops.mesh.primitive_torus_add(major_radius=0.17, minor_radius=0.025, location=p)
    fl = bpy.context.active_object
    fl.rotation_mode = "QUATERNION"
    fl.rotation_quaternion = d.to_track_quat("Z", "Y")
    finish(fl, "steel_dark", bevel=0)
    box(f"saddle_{k}", (0.18, 0.42, 0.1), (p.x, p.y, 0.05), "concrete", bevel=0.03, rot=(0, 0, math.atan2(d.y, d.x)))

# ---------- Powerhouse (cut open towards the viewer) ----------

phx, phy = (PH["x0"] + PH["x1"]) / 2, (PH["y0"] + PH["y1"]) / 2
wt = 0.14
box("ph_floor", (PH["x1"] - PH["x0"] + 0.25, PH["y1"] - PH["y0"] + 0.25, 0.16), (phx, phy, 0.08), "concrete_dark", bevel=0.04)
box("ph_wall_back", (PH["x1"] - PH["x0"], wt, PH["h"]), (phx, PH["y1"], PH["h"] / 2 + 0.16), "wall", bevel=0.03)
box("ph_wall_left", (wt, PH["y1"] - PH["y0"], PH["h"]), (PH["x0"], phy, PH["h"] / 2 + 0.16), "wall", bevel=0.03)
box("ph_wall_front", (PH["x1"] - PH["x0"], wt, 0.45), (phx, PH["y0"], 0.38), "wall", bevel=0.03)
box("ph_wall_right", (wt, PH["y1"] - PH["y0"], 0.45), (PH["x1"], phy, 0.38), "wall", bevel=0.03)
# Cut edges of the walls drawn as a darker band, like a section drawing.
box("ph_cut_front", (PH["x1"] - PH["x0"], wt + 0.01, 0.05), (phx, PH["y0"], 0.62), "roof", bevel=0.01)
box("ph_cut_right", (wt + 0.01, PH["y1"] - PH["y0"], 0.05), (PH["x1"], phy, 0.62), "roof", bevel=0.01)
# Windows with frames on the back wall, a door on the left wall.
for k in range(3):
    wx = PH["x0"] + 0.45 + k * 0.65
    box(f"win_{k}", (0.38, 0.05, 0.5), (wx, PH["y1"] - wt / 2 - 0.01, 1.1), "glass", bevel=0.01)
    box(f"win_bar_{k}", (0.02, 0.06, 0.5), (wx, PH["y1"] - wt / 2 - 0.02, 1.1), "roof", bevel=0)
box("door", (0.06, 0.5, 0.85), (PH["x0"] - wt / 2 - 0.01, PH["y0"] + 0.5, 0.6), "steel_dark", bevel=0.02)
# Partial roof with a parapet, over the back third.
box("ph_roof", (PH["x1"] - PH["x0"] + 0.3, 0.75, 0.14), (phx, PH["y1"] - 0.25, PH["h"] + 0.23), "roof", bevel=0.04)
box("ph_parapet", (PH["x1"] - PH["x0"] + 0.3, 0.06, 0.12), (phx, PH["y1"] + 0.09, PH["h"] + 0.36), "roof", bevel=0.02)
# Overhead crane: rails on the walls and a yellow bridge with a hook.
for yy in (PH["y1"] - 0.2, PH["y0"] + 0.15):
    rod(f"crane_rail_{yy:+.1f}", (PH["x0"] + 0.1, yy, 1.45), (PH["x1"] - 0.1, yy, 1.45), 0.025, "steel_dark")
box("crane_bridge", (0.12, PH["y1"] - PH["y0"] - 0.2, 0.12), (TX - 0.5, phy - 0.02, 1.52), "accent", bevel=0.02)
box("crane_trolley", (0.22, 0.22, 0.12), (TX - 0.5, TY + 0.2, 1.4), "steel_dark", bevel=0.02)
rod("crane_cable", (TX - 0.5, TY + 0.2, 1.34), (TX - 0.5, TY + 0.2, 0.95), 0.008, "ink")

# Turbine: spiral casing, Kaplan runner, shaft, generator.
bpy.ops.mesh.primitive_torus_add(major_radius=0.5, minor_radius=0.17, location=(TX, TY, 0.26))
finish(bpy.context.active_object, "steel", bevel=0)
cylinder("pit", 0.36, 0.06, (TX, TY, 0.2), "ink", bevel=0, outline=False)
hub = cylinder("runner_hub", 0.11, 0.26, (TX, TY, 0.33), "runner", r2=0.05)
for i in range(4):
    a = i * math.pi / 2 + 0.4
    b = box(f"blade_{i}", (0.3, 0.13, 0.03), (TX + math.cos(a) * 0.2, TY + math.sin(a) * 0.2, 0.37), "runner", bevel=0.01)
    b.rotation_euler = (0.5, 0, a)
cylinder("shaft", 0.055, 0.6, (TX, TY, 0.68), "steel_dark", bevel=0.005)
cylinder("generator", 0.42, 0.5, (TX, TY, 1.12), "generator", bevel=0.03)
for i in range(16):
    a = i * math.tau / 16
    box(f"gen_rib_{i}", (0.05, 0.05, 0.42), (TX + math.cos(a) * 0.43, TY + math.sin(a) * 0.43, 1.12), "generator", bevel=0.01, rot=(0, 0, a), outline=False)
cylinder("gen_cap", 0.3, 0.12, (TX, TY, 1.43), "steel", bevel=0.02)
cylinder("exciter", 0.15, 0.14, (TX, TY, 1.56), "steel_dark", bevel=0.02)
# Control panels along the left wall, with lit indicators.
for k in range(3):
    py = PH["y0"] + 0.45 + k * 0.42
    box(f"panel_{k}", (0.22, 0.36, 0.78), (PH["x0"] + 0.2, py, 0.55), "roof", bevel=0.02)
    for j, col in enumerate(("accent", "grass", "red")):
        box(f"lamp_{k}_{j}", (0.02, 0.05, 0.05), (PH["x0"] + 0.32, py - 0.1 + j * 0.1, 0.78), col, bevel=0, outline=False)
    box(f"screen_{k}", (0.02, 0.22, 0.16), (PH["x0"] + 0.32, py, 0.58), "glass", bevel=0, outline=False)

# Tailrace back into the river.
box("tailrace_wall_a", (1.0, 0.1, 0.5), (TX + 0.2, CH["y0"] - 0.05, -0.2), "concrete", bevel=0.03)
water("tailrace_water", TX - 0.25, TX + 0.65, -0.3, y0=CH["y0"] - 0.4, y1=CH["y0"] + 0.05)

# ---------- Transformer yard ----------

box("tr_pad", (1.3, 1.1, 0.1), (TR[0], TR[1], 0.05), "concrete_dark", bevel=0.03)
box("tr_tank", (0.6, 0.5, 0.62), (TR[0], TR[1], 0.41), "steel", bevel=0.04)
for k in range(5):
    box(f"tr_fin_{k}", (0.04, 0.07, 0.5), (TR[0] + 0.35, TR[1] - 0.2 + k * 0.1, 0.38), "steel", bevel=0.01)
    box(f"tr_finb_{k}", (0.04, 0.07, 0.5), (TR[0] - 0.35, TR[1] - 0.2 + k * 0.1, 0.38), "steel", bevel=0.01)
cylinder("tr_conservator", 0.09, 0.5, (TR[0], TR[1] + 0.22, 0.86), "steel", rot=(0, math.pi / 2, 0), bevel=0.01)
bushings = []
for k in range(3):
    bx = TR[0] - 0.18 + k * 0.18
    cylinder(f"tr_bushing_{k}", 0.04, 0.3, (bx, TR[1] - 0.05, 0.86), "foam", segments=12, bevel=0.005)
    for j in range(3):
        cylinder(f"tr_disc_{k}_{j}", 0.06, 0.02, (bx, TR[1] - 0.05, 0.78 + j * 0.08), "foam", segments=12, bevel=0, outline=False)
    bushings.append(Vector((bx, TR[1] - 0.05, 1.02)))
# Fence around the yard.
fx0, fx1, fy0, fy1 = TR[0] - 0.75, TR[0] + 0.75, TR[1] - 0.65, TR[1] + 0.65
posts = [(fx0, fy0), (fx1, fy0), (fx1, fy1), (fx0, fy1)]
for i, (ax, ay) in enumerate(posts):
    bx, by = posts[(i + 1) % 4]
    for t in (0, 0.25, 0.5, 0.75):
        px, py = ax + (bx - ax) * t, ay + (by - ay) * t
        rod(f"fence_post_{i}_{t}", (px, py, 0), (px, py, 0.32), 0.012, "steel_dark")
    rod(f"fence_top_{i}", (ax, ay, 0.32), (bx, by, 0.32), 0.008, "steel_dark")
    rod(f"fence_mid_{i}", (ax, ay, 0.17), (bx, by, 0.17), 0.006, "steel_dark")

# ---------- Pylon ----------

px, py, ph = PY
legs = []
for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
    a = (px + sx * 0.38, py + sy * 0.38, 0)
    b = (px + sx * 0.08, py + sy * 0.08, ph)
    rod(f"py_leg_{sx}{sy}", a, b, 0.03, "ink")
    legs.append((Vector(a), Vector(b)))
levels = [0.0, 0.7, 1.35, 1.95, 2.5]
for li in range(len(levels) - 1):
    for i in range(4):
        a0, a1 = legs[i]
        b0, b1 = legs[(i + 1) % 4]
        za, zb = levels[li] / ph, levels[li + 1] / ph
        pa, pb = a0.lerp(a1, za), b0.lerp(b1, za)
        qa, qb = a0.lerp(a1, zb), b0.lerp(b1, zb)
        rod(f"py_x1_{li}_{i}", pa, qb, 0.012, "ink")
        rod(f"py_x2_{li}_{i}", pb, qa, 0.012, "ink")
        rod(f"py_h_{li}_{i}", qa, qb, 0.014, "ink")
arm_z = ph - 0.25
rod("py_arm", (px, py - 0.75, arm_z), (px, py + 0.75, arm_z), 0.03, "ink")
rod("py_arm_brace_a", (px, py - 0.75, arm_z), (px, py - 0.08, ph - 0.05), 0.012, "ink")
rod("py_arm_brace_b", (px, py + 0.75, arm_z), (px, py + 0.08, ph - 0.05), 0.012, "ink")
ends = []
for k, dy in enumerate((-0.65, 0.0, 0.65)):
    top = Vector((px, py + dy, arm_z))
    for j in range(3):
        cylinder(f"py_ins_{k}_{j}", 0.045, 0.02, (px, py + dy, arm_z - 0.07 - j * 0.06), "foam", segments=12, bevel=0, outline=False)
    ends.append(top - Vector((0, 0, 0.22)))


def wire(name, a, b, sag):
    mid = (a + b) / 2 - Vector((0, 0, sag))
    tube(name, [tuple(a), tuple((a + mid) / 2 - Vector((0, 0, sag * 0.3))), tuple(mid), tuple((mid + b) / 2 - Vector((0, 0, sag * 0.3))), tuple(b)], 0.009, "ink", segments=8, outline=False)


for k in range(3):
    wire(f"wire_in_{k}", bushings[k], ends[k], 0.15)
    wire(f"wire_out_{k}", ends[k], ends[k] + Vector((1.25, 0.55, -0.45)), 0.12)

# ---------- Trees, bushes, rocks ----------


def round_tree(name, x, y, s):
    cylinder(f"{name}_trunk", 0.05 * s, 0.4 * s, (x, y, 0.2 * s), "trunk", segments=10, r2=0.035 * s, bevel=0.005)
    for j, (dx, dy, dz, r) in enumerate(((0, 0, 0.62, 0.32), (0.13, -0.08, 0.5, 0.22), (-0.12, 0.06, 0.78, 0.2))):
        sphere(f"{name}_crown_{j}", r * s, (x + dx * s, y + dy * s, dz * s), "grass_dark", subdiv=2)


def pine(name, x, y, s):
    cylinder(f"{name}_trunk", 0.045 * s, 0.25 * s, (x, y, 0.12 * s), "trunk", segments=10, bevel=0.005)
    for j in range(3):
        cylinder(f"{name}_tier_{j}", (0.34 - j * 0.08) * s, 0.36 * s, (x, y, (0.38 + j * 0.24) * s), "grass_dark", segments=9, r2=0.02, bevel=0.01)


spots = [
    (-5.6, 3.3, 1.1, "r"), (-4.6, 2.4, 0.85, "p"), (-3.3, 3.6, 1.2, "r"), (-1.8, 2.7, 0.9, "p"), (-0.4, 3.5, 1.05, "r"),
    (1.0, 2.5, 0.8, "p"), (2.6, 3.4, 1.15, "r"), (4.0, 2.4, 0.9, "p"), (5.5, 3.3, 1.0, "r"), (6.0, 1.6, 0.75, "p"),
    (-5.7, -3.4, 1.0, "p"), (-4.5, -2.4, 1.1, "r"), (-3.4, -3.6, 0.8, "p"), (-0.6, -3.6, 0.9, "r"), (1.2, -3.8, 0.8, "p"),
    (6.3, -1.5, 0.8, "r"), (-5.9, -1.5, 0.7, "p"),
]
for i, (x, y, s, kind) in enumerate(spots):
    (round_tree if kind == "r" else pine)(f"tree_{i}", x, y, s)
for i in range(14):
    x, y = random.uniform(SLAB["x0"] + 0.4, SLAB["x1"] - 0.4), random.choice((1, -1)) * random.uniform(1.2, 4.0)
    if PH["x0"] - 0.6 < x < TR[0] + 1.0 and y < -1.0:
        continue
    sphere(f"bush_{i}", random.uniform(0.1, 0.17), (x, y, 0.06), "grass_dark", subdiv=2, scale=(1.3, 1, 0.75))
for i, (x, y, r) in enumerate(((-2.0, 1.6, 0.2), (0.4, 1.5, 0.15), (3.3, 1.3, 0.18), (-4.8, -1.3, 0.22), (2.9, -3.8, 0.16))):
    s = sphere(f"rock_{i}", r, (x, y, r * 0.35), "rock", subdiv=1, scale=(1.3, 1, 0.75))
    s.rotation_euler = (0, 0, random.uniform(0, 3))

# Gravel path from the edge to the powerhouse door.
for k in range(10):
    box(f"path_{k}", (0.42, 0.3, 0.02), (PH["x0"] - 0.45 - k * 0.32, PH["y0"] + 0.5 - k * 0.06, 0.01), "concrete_dark", bevel=0.01, outline=False)

# ---------- Camera ----------

cam = bpy.data.objects.get("Camera")
if not cam:
    cam = bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
    bpy.context.scene.collection.objects.link(cam)
cam.data.type = "ORTHO"
cam.data.ortho_scale = 17.5
target = Vector((0.2, -0.1, -0.6))
d = Vector((1, -1, 0.82)).normalized() * 30
cam.location = target + d
cam.rotation_mode = "QUATERNION"
cam.rotation_quaternion = (-d).to_track_quat("-Z", "Y")
cam.data.clip_end = 100
sc = bpy.context.scene
sc.camera = cam
sc.render.resolution_x, sc.render.resolution_y = 1600, 1000
print("built", len(coll().objects), "objects")
