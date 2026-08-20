"""
scripts/export_glb_headless.py
Script de automatización para Blender Headless (bpy)
pattern-ai-core

Genera una malla 3D textil paramétrica con mapeo UV y material PBR,
exportando el resultado a un archivo binario glTF 2.0 (.glb).

Uso:
    blender -b -P scripts/export_glb_headless.py -- --dna path/to/dna.json --output path/to/model.glb --fabric linen
"""

import sys
import os
import json
import math
import argparse

try:
    import bpy
    import bmesh
    import mathutils
    from mathutils import Matrix, Vector
except ImportError:
    print("[ERROR] Este script debe ser ejecutado dentro de Blender (ej: blender -b -P scripts/export_glb_headless.py)")
    sys.exit(1)


def parse_args():
    # En Blender, los argumentos personalizados van después de '--'
    argv = sys.argv
    if "--" in argv:
        custom_args = argv[argv.index("--") + 1:]
    else:
        custom_args = []

    parser = argparse.ArgumentParser(description="Exportar prenda 3D a .glb en Blender Headless")
    parser.add_argument("--dna", type=str, default="", help="Ruta al archivo JSON de ADN Paramétrico")
    parser.add_argument("--output", type=str, default="output/test_3d/garment.glb", help="Ruta de exportación .glb")
    parser.add_argument("--fabric", type=str, default="linen", help="Tipo de tela PBR (linen, denim, cotton, silk)")
    parser.add_argument("--color", type=str, default="", help="Color RGB separado por coma (ej: 0.84,0.16,0.16)")
    parser.add_argument("--roughness", type=float, default=0.85, help="Rugosidad PBR (0.0 a 1.0)")
    parser.add_argument("--metallic", type=float, default=0.0, help="Metálico PBR (0.0 a 1.0)")
    parser.add_argument("--subdivisions", type=int, default=2, help="Nivel de subdivisión de superficie")

    return parser.parse_args(custom_args)


def clean_scene():
    """Elimina todos los objetos, mallas y materiales de la escena inicial."""
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')

    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)


def create_pbr_material(name, base_color=(0.82, 0.78, 0.70, 1.0), roughness=0.85, metallic=0.0):
    """Crea y configura un material PBR Principled BSDF compatible con Blender 3.x, 4.x y 5.x."""
    mat = bpy.data.materials.new(name=name)
    if hasattr(mat, "use_nodes"):
        mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out_node = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')

    # Color Base
    if "Base Color" in bsdf.inputs:
        bsdf.inputs["Base Color"].default_value = base_color

    # Rugosidad
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = roughness

    # Metálico
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = metallic

    # Subsurface sutil si está disponible
    if "Subsurface Weight" in bsdf.inputs:
        bsdf.inputs["Subsurface Weight"].default_value = 0.05
    elif "Subsurface" in bsdf.inputs:
        bsdf.inputs["Subsurface"].default_value = 0.05

    links.new(bsdf.outputs["BSDF"], out_node.inputs["Surface"])
    return mat


def build_garment_mesh(dna_data, material):
    """Construye la geometría de la prenda en base al ADN o tipología."""
    bm = bmesh.new()

    # Determinar categoría y tipo
    category = "top"
    base_block = "menswear_torso"
    if dna_data:
        category = dna_data.get("garment_category", "top")
        base_block = dna_data.get("base_block", "menswear_torso")

    is_bottom = (
        category == "bottom" or
        "pant" in base_block or
        "trouser" in base_block or
        "short" in base_block or
        "bermuda" in base_block
    )
    is_dress = category == "dress" or "dress" in base_block
    is_kimono = category in ["kimono", "haori"] or "kimono" in base_block

    if is_bottom:
        # Generar piernas 3D de pantalón/bermuda
        # Pierna Izquierda
        bmesh.ops.create_cone(
            bm,
            cap_ends=True,
            cap_tris=False,
            segments=24,
            radius1=0.11,
            radius2=0.08,
            depth=0.55,
            matrix=Matrix.Translation((0.10, 0.0, 0.70))
        )
        # Pierna Derecha
        bmesh.ops.create_cone(
            bm,
            cap_ends=True,
            cap_tris=False,
            segments=24,
            radius1=0.11,
            radius2=0.08,
            depth=0.55,
            matrix=Matrix.Translation((-0.10, 0.0, 0.70))
        )
        # Pretina
        bmesh.ops.create_cone(
            bm,
            cap_ends=False,
            segments=32,
            radius1=0.18,
            radius2=0.18,
            depth=0.08,
            matrix=Matrix.Translation((0.0, 0.0, 1.00))
        )
    elif is_dress:
        # Torso Superior
        bmesh.ops.create_cone(
            bm,
            cap_ends=False,
            segments=32,
            radius1=0.20,
            radius2=0.17,
            depth=0.40,
            matrix=Matrix.Translation((0.0, 0.0, 1.25))
        )
        # Falda Envolvente
        bmesh.ops.create_cone(
            bm,
            cap_ends=False,
            segments=32,
            radius1=0.17,
            radius2=0.32,
            depth=0.60,
            matrix=Matrix.Translation((0.0, 0.0, 0.75))
        )
    elif is_kimono:
        # Cuerpo Principal Haori / Kimono
        bmesh.ops.create_cube(
            bm,
            size=0.45,
            matrix=Matrix.Translation((0.0, 0.0, 1.15)) @ Matrix.Diagonal((1.0, 0.6, 1.5, 1.0))
        )
        # Manga Izquierda Cuadrada Furisode
        bmesh.ops.create_cube(
            bm,
            size=0.35,
            matrix=Matrix.Translation((0.35, 0.0, 1.15)) @ Matrix.Diagonal((0.3, 0.5, 1.2, 1.0))
        )
        # Manga Derecha Cuadrada Furisode
        bmesh.ops.create_cube(
            bm,
            size=0.35,
            matrix=Matrix.Translation((-0.35, 0.0, 1.15)) @ Matrix.Diagonal((0.3, 0.5, 1.2, 1.0))
        )
    else:
        # Top / Chaleco / Chaqueta / Camiseta
        # Panel frontal y dorsal cilíndrico anatómico
        bmesh.ops.create_cone(
            bm,
            cap_ends=False,
            segments=32,
            radius1=0.21,
            radius2=0.19,
            depth=0.55,
            matrix=Matrix.Translation((0.0, 0.0, 1.18))
        )
        # Solapas / Detalles de chaleco
        bmesh.ops.create_cube(
            bm,
            size=0.12,
            matrix=Matrix.Translation((0.10, 0.12, 1.20))
        )

    # Crear objeto de malla en Blender
    mesh_data = bpy.data.meshes.new("Garment_3D_Mesh")
    bm.to_mesh(mesh_data)
    bm.free()

    garment_obj = bpy.data.objects.new("Garment_3D", mesh_data)
    bpy.context.scene.collection.objects.link(garment_obj)

    # Asignar material
    if garment_obj.data.materials:
        garment_obj.data.materials[0] = material
    else:
        garment_obj.data.materials.append(material)

    # Configurar shading suave (smooth normals)
    for poly in garment_obj.data.polygons:
        poly.use_smooth = True

    # Generar coordenadas UV automáticas
    bpy.context.view_layer.objects.active = garment_obj
    garment_obj.select_set(True)
    try:
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(island_margin=0.02)
        bpy.ops.object.mode_set(mode='OBJECT')
    except Exception as uv_err:
        print(f"[WARN] UV Smart Project: {uv_err}")

    return garment_obj


def main():
    args = parse_args()

    clean_scene()

    # Cargar ADN si fue especificado
    dna_data = None
    if args.dna and os.path.exists(args.dna):
        try:
            with open(args.dna, 'r', encoding='utf-8') as f:
                dna_data = json.load(f)
        except Exception as e:
            print(f"[WARN] No se pudo leer archivo de ADN: {e}")

    # Determinar color
    base_color = (0.82, 0.78, 0.70, 1.0)
    if args.color:
        try:
            parts = [float(x.strip()) for x in args.color.split(",")]
            if len(parts) >= 3:
                a_val = parts[3] if len(parts) >= 4 else 1.0
                base_color = (parts[0], parts[1], parts[2], a_val)
        except Exception:
            pass
    elif args.fabric == "denim":
        base_color = (0.15, 0.28, 0.48, 1.0)
    elif args.fabric == "cotton":
        base_color = (0.90, 0.90, 0.88, 1.0)
    elif args.fabric == "silk":
        base_color = (0.88, 0.82, 0.90, 1.0)

    # Material
    mat_name = f"M_{args.fabric.capitalize()}"
    mat = create_pbr_material(
        name=mat_name,
        base_color=base_color,
        roughness=args.roughness,
        metallic=args.metallic
    )

    # Malla 3D
    garment_obj = build_garment_mesh(dna_data, mat)

    # Crear directorio de salida
    out_dir = os.path.dirname(args.output)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    # Exportación binaria glTF 2.0 (.glb)
    print(f"[Blender Headless] Exportando modelo a {args.output}...")
    bpy.ops.export_scene.gltf(
        filepath=args.output,
        export_format='GLB',
        use_selection=False,
        export_materials='EXPORT',
        export_normals=True,
        export_texcoords=True
    )

    if os.path.exists(args.output):
        size_bytes = os.path.getsize(args.output)
        print(f"[BLENDER 3D EXPORT SUCCESS] Guardado: {args.output} ({size_bytes} bytes)")
    else:
        print(f"[ERROR] Archivo no generado en: {args.output}")
        sys.exit(1)


if __name__ == "__main__":
    main()
