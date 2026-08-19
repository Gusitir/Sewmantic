import bpy
import bmesh
import math
import os

def build_pattern_assembled_vest():
    # -------------------------------------------------------------
    # 0. SCENE CLEANUP
    # -------------------------------------------------------------
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')

    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)
    for cam in list(bpy.data.cameras):
        bpy.data.cameras.remove(cam, do_unlink=True)
    for light in list(bpy.data.lights):
        bpy.data.lights.remove(light, do_unlink=True)

    # Collections
    col_names = ["Mannequin", "Garment_Vest", "Lighting_Studio", "Camera_Rig"]
    cols = {}
    for col_name in col_names:
        if col_name not in bpy.data.collections:
            new_col = bpy.data.collections.new(col_name)
            bpy.context.scene.collection.children.link(new_col)
            cols[col_name] = new_col
        else:
            cols[col_name] = bpy.data.collections[col_name]
            if cols[col_name].name not in [c.name for c in bpy.context.scene.collection.children]:
                bpy.context.scene.collection.children.link(cols[col_name])

    col_mann = cols["Mannequin"]
    col_vest = cols["Garment_Vest"]
    col_light = cols["Lighting_Studio"]
    col_cam = cols["Camera_Rig"]

    def link_obj(obj, target_col):
        if target_col.name not in [c.name for c in obj.users_collection]:
            target_col.objects.link(obj)
        for c in list(obj.users_collection):
            if c != target_col:
                c.objects.unlink(obj)

    # System Units
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1.0
    bpy.context.scene.unit_settings.length_unit = 'METERS'

    # Render settings (EEVEE)
    bpy.context.scene.render.engine = 'BLENDER_EEVEE'
    bpy.context.scene.render.resolution_x = 1920
    bpy.context.scene.render.resolution_y = 1080
    bpy.context.scene.render.resolution_percentage = 100

    # -------------------------------------------------------------
    # 1. MATERIALS DEFINITION
    # -------------------------------------------------------------
    def get_or_create_mat(name):
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        return mat

    # A. Mannequin Linen Fabric (#E6DFD3)
    mat_mann = get_or_create_mat("M_Mannequin_Linen")
    nm = mat_mann.node_tree.nodes
    lm = mat_mann.node_tree.links
    nm.clear()
    out_m = nm.new('ShaderNodeOutputMaterial')
    bsdf_m = nm.new('ShaderNodeBsdfPrincipled')
    bsdf_m.inputs['Base Color'].default_value = (0.78, 0.73, 0.65, 1.0)
    bsdf_m.inputs['Roughness'].default_value = 0.85
    lm.new(bsdf_m.outputs['BSDF'], out_m.inputs['Surface'])

    # B. Wood / Dark Finish (#2C1810)
    mat_wood = get_or_create_mat("M_Dark_Mahogany")
    nw = mat_wood.node_tree.nodes
    lw = mat_wood.node_tree.links
    nw.clear()
    out_w = nw.new('ShaderNodeOutputMaterial')
    bsdf_w = nw.new('ShaderNodeBsdfPrincipled')
    bsdf_w.inputs['Base Color'].default_value = (0.08, 0.035, 0.02, 1.0)
    bsdf_w.inputs['Roughness'].default_value = 0.30
    lw.new(bsdf_w.outputs['BSDF'], out_w.inputs['Surface'])

    # C. Vest Rustic Red Linen Canvas (#A93226 / #B83227)
    mat_vest = get_or_create_mat("M_Rustic_Red_Linen_Vest")
    nv = mat_vest.node_tree.nodes
    lv = mat_vest.node_tree.links
    nv.clear()
    out_v = nv.new('ShaderNodeOutputMaterial')
    bsdf_v = nv.new('ShaderNodeBsdfPrincipled')

    # Color: Rustic vermilion / terracotta red
    bsdf_v.inputs['Base Color'].default_value = (0.48, 0.035, 0.020, 1.0)
    bsdf_v.inputs['Roughness'].default_value = 0.88
    if 'Sheen Weight' in bsdf_v.inputs:
        bsdf_v.inputs['Sheen Weight'].default_value = 0.60
    if 'Specular IOR Level' in bsdf_v.inputs:
        bsdf_v.inputs['Specular IOR Level'].default_value = 0.20

    # Procedural linen weave bump
    tex_noise_v = nv.new('ShaderNodeTexNoise')
    tex_noise_v.inputs['Scale'].default_value = 180.0
    tex_noise_v.inputs['Detail'].default_value = 5.0
    tex_noise_v.inputs['Roughness'].default_value = 0.65

    bump_v = nv.new('ShaderNodeBump')
    bump_v.inputs['Strength'].default_value = 0.15
    bump_v.inputs['Distance'].default_value = 0.002

    noise_out = tex_noise_v.outputs['Factor'] if 'Factor' in tex_noise_v.outputs else tex_noise_v.outputs[0]
    lv.new(noise_out, bump_v.inputs['Height'])
    lv.new(bump_v.outputs['Normal'], bsdf_v.inputs['Normal'])
    lv.new(bsdf_v.outputs['BSDF'], out_v.inputs['Surface'])

    # D. Buttons Satin Black (#1A1A1A)
    mat_btn = get_or_create_mat("M_Black_Satin_Button")
    nb = mat_btn.node_tree.nodes
    lb = mat_btn.node_tree.links
    nb.clear()
    out_b = nb.new('ShaderNodeOutputMaterial')
    bsdf_b = nb.new('ShaderNodeBsdfPrincipled')
    bsdf_b.inputs['Base Color'].default_value = (0.015, 0.015, 0.015, 1.0)
    bsdf_b.inputs['Roughness'].default_value = 0.20
    bsdf_b.inputs['Metallic'].default_value = 0.15
    lb.new(bsdf_b.outputs['BSDF'], out_b.inputs['Surface'])

    # E. Neutral Studio Cyclorama
    mat_bg = get_or_create_mat("M_Studio_Backdrop")
    nbg = mat_bg.node_tree.nodes
    lbg = mat_bg.node_tree.links
    nbg.clear()
    out_bg = nbg.new('ShaderNodeOutputMaterial')
    bsdf_bg = nbg.new('ShaderNodeBsdfPrincipled')
    bsdf_bg.inputs['Base Color'].default_value = (0.10, 0.11, 0.14, 1.0)
    bsdf_bg.inputs['Roughness'].default_value = 0.95
    lbg.new(bsdf_bg.outputs['BSDF'], out_bg.inputs['Surface'])

    # -------------------------------------------------------------
    # 2. CREATE DRESS FORM MANNEQUIN
    # -------------------------------------------------------------
    rings_def = [
        # (z, rx, ry_front, ry_back, y_offset)
        (1.52, 0.060, 0.055, 0.058, 0.000),  # Top neck
        (1.47, 0.065, 0.060, 0.062, 0.000),  # Mid neck
        (1.42, 0.082, 0.075, 0.075, 0.002),  # Neck base
        (1.38, 0.210, 0.100, 0.110, 0.005),  # Shoulders
        (1.33, 0.195, 0.125, 0.120, 0.010),  # Upper chest
        (1.27, 0.180, 0.140, 0.120, 0.012),  # Full Chest -> 98cm
        (1.20, 0.170, 0.125, 0.115, 0.008),  # Ribcage
        (1.13, 0.160, 0.115, 0.110, 0.004),  # High waist
        (1.06, 0.155, 0.108, 0.110, 0.000),  # Waist -> 86cm
        (0.99, 0.164, 0.115, 0.118, -0.002), # High hip
        (0.92, 0.175, 0.122, 0.135, -0.005), # Mid hip
        (0.85, 0.178, 0.120, 0.138, -0.008), # Low hip -> 98cm
        (0.79, 0.165, 0.105, 0.115, -0.005), # Bottom rim
    ]

    N_SEGS = 36
    mann_verts = []
    mann_faces = []

    for r_idx, (z, rx, ry_f, ry_b, y_off) in enumerate(rings_def):
        for s in range(N_SEGS):
            angle = s * (2.0 * math.pi / N_SEGS)
            cos_a = math.cos(angle)
            sin_a = math.sin(angle)
            x = rx * cos_a
            ry = ry_f if sin_a >= 0 else ry_b
            y = ry * sin_a + y_off
            mann_verts.append((x, y, z))

    for r in range(len(rings_def) - 1):
        r_start = r * N_SEGS
        next_r_start = (r + 1) * N_SEGS
        for s in range(N_SEGS):
            s_next = (s + 1) % N_SEGS
            v1 = r_start + s
            v2 = r_start + s_next
            v3 = next_r_start + s_next
            v4 = next_r_start + s
            mann_faces.append((v1, v2, v3, v4))

    bottom_center_idx = len(mann_verts)
    mann_verts.append((0.0, -0.005, 0.785))
    last_r_start = (len(rings_def) - 1) * N_SEGS
    for s in range(N_SEGS):
        s_next = (s + 1) % N_SEGS
        mann_faces.append((last_r_start + s_next, last_r_start + s, bottom_center_idx))

    top_center_idx = len(mann_verts)
    mann_verts.append((0.0, 0.0, 1.522))
    for s in range(N_SEGS):
        s_next = (s + 1) % N_SEGS
        mann_faces.append((s, s_next, top_center_idx))

    mesh_mann = bpy.data.meshes.new("Mannequin_Torso_Mesh")
    mesh_mann.from_pydata(mann_verts, [], mann_faces)
    mesh_mann.update()
    obj_mann = bpy.data.objects.new("Mannequin_Torso", mesh_mann)
    link_obj(obj_mann, col_mann)
    obj_mann.data.materials.append(mat_mann)

    mod_sub_m = obj_mann.modifiers.new("Subdivision", 'SUBSURF')
    mod_sub_m.levels = 2
    mod_sub_m.render_levels = 2
    for poly in obj_mann.data.polygons:
        poly.use_smooth = True

    # Stand pole, Base, Neck Cap, Finial
    bpy.ops.mesh.primitive_cylinder_add(radius=0.016, depth=0.82, location=(0, -0.005, 0.41))
    obj_pole = bpy.context.active_object
    obj_pole.name = "Mannequin_Pole"
    link_obj(obj_pole, col_mann)
    obj_pole.data.materials.append(mat_wood)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=0.04, location=(0, -0.005, 0.02))
    obj_base = bpy.context.active_object
    obj_base.name = "Mannequin_Stand_Base"
    link_obj(obj_base, col_mann)
    obj_base.data.materials.append(mat_wood)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.060, depth=0.030, location=(0, 0.0, 1.535))
    obj_neck_cap = bpy.context.active_object
    obj_neck_cap.name = "Mannequin_Neck_Cap"
    link_obj(obj_neck_cap, col_mann)
    obj_neck_cap.data.materials.append(mat_wood)

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.042, location=(0, 0.0, 1.570))
    obj_finial = bpy.context.active_object
    obj_finial.name = "Mannequin_Finial"
    link_obj(obj_finial, col_mann)
    obj_finial.data.materials.append(mat_wood)

    # -------------------------------------------------------------
    # 3. 3D PATTERN-BASED VEST ASSEMBLY (DELANTERO + ESPALDA)
    # -------------------------------------------------------------
    EASE = 0.016

    def get_body_radii(z_val):
        z_cl = max(rings_def[-1][0], min(rings_def[0][0], z_val))
        for i in range(len(rings_def) - 1):
            z_t, rx_t, ry_ft, ry_bt, yo_t = rings_def[i]
            z_b, rx_b, ry_fb, ry_bb, yo_b = rings_def[i+1]
            if z_b <= z_cl <= z_t:
                t = (z_t - z_cl) / (z_t - z_b) if (z_t > z_b) else 0.0
                rx = (1 - t) * rx_t + t * rx_b + EASE
                ry_f = (1 - t) * ry_ft + t * ry_fb + EASE
                ry_b = (1 - t) * ry_bt + t * ry_bb + EASE
                yo = (1 - t) * yo_t + t * yo_b
                return rx, ry_f, ry_b, yo
        return 0.19 + EASE, 0.13 + EASE, 0.13 + EASE, 0.0

    NU = 24
    NV = 16

    vest_verts = []
    vest_faces = []

    # -------------------------------------------------------------
    # A. FRONT PANEL GENERATION (Delantero)
    # -------------------------------------------------------------
    def front_z_top(u):
        au = abs(u)
        if au < 0.40:
            t = au / 0.40
            return 1.180 + (1.425 - 1.180) * (t ** 1.35)
        else:
            t = (au - 0.40) / 0.60
            return 1.425 + (1.390 - 1.425) * t

    def front_z_bot(u):
        au = abs(u)
        if au < 0.28:
            t = au / 0.28
            return 0.870 - (0.870 - 0.810) * t
        else:
            t = (au - 0.28) / 0.72
            return 0.810 + (0.910 - 0.810) * (t ** 0.85)

    front_grid = []
    for vi in range(NV):
        tv = vi / (NV - 1)
        row = []
        for ui in range(NU + 1):
            u = -1.0 + 2.0 * (ui / NU)
            zt = front_z_top(u)
            zb = front_z_bot(u)
            z = (1.0 - tv) * zt + tv * zb

            rx, ry_f, _, yo = get_body_radii(z)

            angle = (math.pi * 0.5) - (u * math.pi * 0.5)
            x = rx * math.cos(angle)
            y = ry_f * math.sin(angle) + yo

            if abs(u) < 0.001:
                x = 0.0

            idx = len(vest_verts)
            vest_verts.append((x, y, z))
            row.append(idx)
        front_grid.append(row)

    for vi in range(NV - 1):
        for ui in range(NU):
            v_tl = front_grid[vi][ui]
            v_tr = front_grid[vi][ui + 1]
            v_br = front_grid[vi + 1][ui + 1]
            v_bl = front_grid[vi + 1][ui]
            vest_faces.append((v_tl, v_bl, v_br, v_tr))

    # -------------------------------------------------------------
    # B. BACK PANEL GENERATION (Espalda)
    # -------------------------------------------------------------
    def back_z_top(u):
        au = abs(u)
        if au < 0.40:
            t = au / 0.40
            return 1.410 + (1.425 - 1.410) * math.sin(t * math.pi * 0.5)
        else:
            t = (au - 0.40) / 0.60
            return 1.425 + (1.390 - 1.425) * t

    def back_z_bot(u):
        return 0.910

    back_grid = []
    for vi in range(NV):
        tv = vi / (NV - 1)
        row = []
        for ui in range(NU + 1):
            u = -1.0 + 2.0 * (ui / NU)
            zt = back_z_top(u)
            zb = back_z_bot(u)
            z = (1.0 - tv) * zt + tv * zb

            rx, _, ry_b, yo = get_body_radii(z)

            angle = -(math.pi * 0.5) + (u * math.pi * 0.5)
            x = rx * math.cos(angle)
            y = -ry_b * math.cos(u * math.pi * 0.5) + yo

            idx = len(vest_verts)
            vest_verts.append((x, y, z))
            row.append(idx)
        back_grid.append(row)

    for vi in range(NV - 1):
        for ui in range(NU):
            v_tl = back_grid[vi][ui]
            v_tr = back_grid[vi][ui + 1]
            v_br = back_grid[vi + 1][ui + 1]
            v_bl = back_grid[vi + 1][ui]
            vest_faces.append((v_tr, v_br, v_bl, v_tl))

    # -------------------------------------------------------------
    # C. SEWING THE SEAMS (WATERTIGHT SHOULDER & SIDE BRIDGES)
    # -------------------------------------------------------------
    left_shoulder_cols = list(range(0, int(NU * 0.30) + 1))
    right_shoulder_cols = list(range(int(NU * 0.70), NU + 1))

    # 1. Left Shoulder Bridge (Shared Mid-Crest Vertices)
    mid_left_indices = []
    for ui in left_shoulder_cols:
        vf = front_grid[0][ui]
        vb = back_grid[0][ui]
        pf, pb = vest_verts[vf], vest_verts[vb]

        xm = 0.5 * (pf[0] + pb[0])
        ym = 0.005
        zm = max(pf[2], pb[2]) + 0.008

        idx = len(vest_verts)
        vest_verts.append((xm, ym, zm))
        mid_left_indices.append(idx)

    for k in range(len(left_shoulder_cols) - 1):
        ui0 = left_shoulder_cols[k]
        ui1 = left_shoulder_cols[k + 1]

        vf0 = front_grid[0][ui0]
        vf1 = front_grid[0][ui1]
        vb0 = back_grid[0][ui0]
        vb1 = back_grid[0][ui1]

        vm0 = mid_left_indices[k]
        vm1 = mid_left_indices[k + 1]

        # Quads Front -> Mid, Mid -> Back
        vest_faces.append((vf0, vm0, vm1, vf1))
        vest_faces.append((vm0, vb0, vb1, vm1))

    # 2. Right Shoulder Bridge (Shared Mid-Crest Vertices)
    mid_right_indices = []
    for ui in right_shoulder_cols:
        vf = front_grid[0][ui]
        vb = back_grid[0][ui]
        pf, pb = vest_verts[vf], vest_verts[vb]

        xm = 0.5 * (pf[0] + pb[0])
        ym = 0.005
        zm = max(pf[2], pb[2]) + 0.008

        idx = len(vest_verts)
        vest_verts.append((xm, ym, zm))
        mid_right_indices.append(idx)

    for k in range(len(right_shoulder_cols) - 1):
        ui0 = right_shoulder_cols[k]
        ui1 = right_shoulder_cols[k + 1]

        vf0 = front_grid[0][ui0]
        vf1 = front_grid[0][ui1]
        vb0 = back_grid[0][ui0]
        vb1 = back_grid[0][ui1]

        vm0 = mid_right_indices[k]
        vm1 = mid_right_indices[k + 1]

        vest_faces.append((vf1, vm1, vm0, vf0))
        vest_faces.append((vm1, vb1, vb0, vm0))

    # 3. Side Seams
    v_underarm = int(NV * 0.35)

    for vi in range(v_underarm, NV - 1):
        vf0 = front_grid[vi][0]
        vf1 = front_grid[vi + 1][0]
        vb0 = back_grid[vi][0]
        vb1 = back_grid[vi + 1][0]
        vest_faces.append((vf0, vf1, vb1, vb0))

    for vi in range(v_underarm, NV - 1):
        vf0 = front_grid[vi][NU]
        vf1 = front_grid[vi + 1][NU]
        vb0 = back_grid[vi][NU]
        vb1 = back_grid[vi + 1][NU]
        vest_faces.append((vf1, vf0, vb0, vb1))

    # -------------------------------------------------------------
    # D. BUILD MESH OBJECT & MODIFIERS
    # -------------------------------------------------------------
    mesh_vest = bpy.data.meshes.new("Straw_Pirate_Vest_Mesh")
    mesh_vest.from_pydata(vest_verts, [], vest_faces)
    mesh_vest.update()

    bm = bmesh.new()
    bm.from_mesh(mesh_vest)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh_vest)
    bm.free()
    mesh_vest.update()

    obj_vest = bpy.data.objects.new("Straw_Pirate_Adventurer_Vest", mesh_vest)
    link_obj(obj_vest, col_vest)
    obj_vest.data.materials.append(mat_vest)

    mod_sol = obj_vest.modifiers.new("Solidify_Fabric", 'SOLIDIFY')
    mod_sol.thickness = 0.0030
    mod_sol.offset = 1.0
    mod_sol.use_even_offset = True
    mod_sol.use_quality_normals = True

    mod_sub_v = obj_vest.modifiers.new("Subdivision_Fabric", 'SUBSURF')
    mod_sub_v.levels = 2
    mod_sub_v.render_levels = 2

    for poly in obj_vest.data.polygons:
        poly.use_smooth = True

    # -------------------------------------------------------------
    # 4. 3 BUTTONS (20 mm BLACK SATIN BUTTONS ON CF)
    # -------------------------------------------------------------
    btn_z_positions = [1.120, 1.000, 0.880]
    btn_objs = []

    for b_i, b_z in enumerate(btn_z_positions):
        _, ry_f, _, yo = get_body_radii(b_z)
        b_pos = (0.0, ry_f + yo + 0.006, b_z)

        bpy.ops.mesh.primitive_cylinder_add(
            radius=0.010,
            depth=0.0035,
            location=b_pos,
            rotation=(math.radians(90), 0, 0)
        )
        obj_btn = bpy.context.active_object
        obj_btn.name = f"Vest_Button_{b_i + 1}"
        link_obj(obj_btn, col_vest)
        obj_btn.data.materials.append(mat_btn)

        mod_bev = obj_btn.modifiers.new("Button_Bevel", 'BEVEL')
        mod_bev.width = 0.001
        mod_bev.segments = 3
        for p in obj_btn.data.polygons:
            p.use_smooth = True
        btn_objs.append(obj_btn)

    # -------------------------------------------------------------
    # 5. STUDIO LIGHTING & FLOOR
    # -------------------------------------------------------------
    obj_target = bpy.data.objects.new("Target_Focus", None)
    obj_target.location = (0.0, 0.0, 1.10)
    link_obj(obj_target, col_cam)

    l1 = bpy.data.lights.new(name="L_Key", type='AREA')
    l1.energy = 130.0
    l1.size = 1.6
    l1.color = (1.0, 0.97, 0.93)
    o1 = bpy.data.objects.new("L_Key", l1)
    o1.location = (-1.8, 1.8, 2.0)
    link_obj(o1, col_light)
    c1 = o1.constraints.new('TRACK_TO')
    c1.target = obj_target
    c1.track_axis = 'TRACK_NEGATIVE_Z'
    c1.up_axis = 'UP_Y'

    l2 = bpy.data.lights.new(name="L_Fill", type='AREA')
    l2.energy = 55.0
    l2.size = 1.8
    l2.color = (0.92, 0.95, 1.0)
    o2 = bpy.data.objects.new("L_Fill", l2)
    o2.location = (1.8, 1.6, 1.6)
    link_obj(o2, col_light)
    c2 = o2.constraints.new('TRACK_TO')
    c2.target = obj_target
    c2.track_axis = 'TRACK_NEGATIVE_Z'
    c2.up_axis = 'UP_Y'

    l3 = bpy.data.lights.new(name="L_Rim", type='AREA')
    l3.energy = 150.0
    l3.size = 1.2
    l3.color = (1.0, 0.98, 0.96)
    o3 = bpy.data.objects.new("L_Rim", l3)
    o3.location = (0.0, -2.2, 1.9)
    link_obj(o3, col_light)
    c3 = o3.constraints.new('TRACK_TO')
    c3.target = obj_target
    c3.track_axis = 'TRACK_NEGATIVE_Z'
    c3.up_axis = 'UP_Y'

    l4 = bpy.data.lights.new(name="L_Top", type='AREA')
    l4.energy = 45.0
    l4.size = 2.5
    o4 = bpy.data.objects.new("L_Top", l4)
    o4.location = (0.0, 0.0, 3.2)
    link_obj(o4, col_light)
    c4 = o4.constraints.new('TRACK_TO')
    c4.target = obj_target
    c4.track_axis = 'TRACK_NEGATIVE_Z'
    c4.up_axis = 'UP_Y'

    bpy.ops.mesh.primitive_cylinder_add(radius=3.5, depth=0.02, location=(0, 0, -0.01))
    obj_floor = bpy.context.active_object
    obj_floor.name = "Studio_Floor"
    link_obj(obj_floor, col_light)
    obj_floor.data.materials.append(mat_bg)

    # -------------------------------------------------------------
    # 6. MULTI-VIEW RENDERING
    # -------------------------------------------------------------
    cam_data = bpy.data.cameras.new("Hero_Camera_Data")
    cam_data.sensor_width = 36.0
    obj_cam = bpy.data.objects.new("Hero_Camera", cam_data)
    link_obj(obj_cam, col_cam)
    bpy.context.scene.camera = obj_cam

    c_cam = obj_cam.constraints.new('TRACK_TO')
    c_cam.target = obj_target
    c_cam.track_axis = 'TRACK_NEGATIVE_Z'
    c_cam.up_axis = 'UP_Y'

    out_dir = r"d:\AGUSTIN\Portafolio\Proyectos\Proyecto App - Generador de Patrones\output\straw_pirate_adventurer_vest"
    os.makedirs(out_dir, exist_ok=True)
    bpy.context.scene.render.image_settings.file_format = 'PNG'
    bpy.context.scene.render.image_settings.color_mode = 'RGBA'

    views_config = [
        {
            "id": "view_34_front",
            "name": "Vista 3/4 Frontal Principal",
            "filename": "straw_pirate_vest_3d_render.png",
            "location": (-1.25, 2.75, 1.25),
            "lens": 58.0,
            "target_loc": (0.0, 0.0, 1.05),
            "up_axis": 'UP_Y'
        },
        {
            "id": "view_top",
            "name": "Vista Superior (Eje Z)",
            "filename": "straw_pirate_vest_view_top.png",
            "location": (0.0, 0.001, 2.80),
            "lens": 50.0,
            "target_loc": (0.0, 0.0, 1.15),
            "up_axis": 'UP_Y'
        },
        {
            "id": "view_front",
            "name": "Vista Frontal (Eje -Y)",
            "filename": "straw_pirate_vest_view_front.png",
            "location": (0.0, 2.70, 1.10),
            "lens": 60.0,
            "target_loc": (0.0, 0.0, 1.05),
            "up_axis": 'UP_Y'
        },
        {
            "id": "view_side",
            "name": "Vista Lateral (Eje X)",
            "filename": "straw_pirate_vest_view_side.png",
            "location": (-2.70, 0.0, 1.10),
            "lens": 60.0,
            "target_loc": (0.0, 0.0, 1.05),
            "up_axis": 'UP_Y'
        },
        {
            "id": "view_aerial_34",
            "name": "3/4 Aéreo (45° Z, -Y, X)",
            "filename": "straw_pirate_vest_view_aerial_34.png",
            "location": (-1.55, 1.75, 2.35),
            "lens": 52.0,
            "target_loc": (0.0, 0.0, 1.05),
            "up_axis": 'UP_Y'
        }
    ]

    rendered_files = []

    for v in views_config:
        obj_target.location = v["target_loc"]
        obj_cam.location = v["location"]
        cam_data.lens = v["lens"]
        c_cam.up_axis = v["up_axis"]

        bpy.context.view_layer.update()

        out_path = os.path.join(out_dir, v["filename"])
        bpy.context.scene.render.filepath = out_path
        bpy.ops.render.render(write_still=True)
        rendered_files.append({
            "id": v["id"],
            "name": v["name"],
            "path": out_path,
            "exists": os.path.exists(out_path),
            "size_bytes": os.path.getsize(out_path) if os.path.exists(out_path) else 0
        })

    return {
        "status": "success",
        "rendered_views": rendered_files,
        "resolution": "1920x1080"
    }

result = build_pattern_assembled_vest()
