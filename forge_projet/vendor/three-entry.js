// Seules les classes de Three.js utilisées par les trophées 3D : esbuild élimine le reste.
export {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Points,
  LatheGeometry, ExtrudeGeometry, TubeGeometry, SphereGeometry, PlaneGeometry, Curve, TorusGeometry, CylinderGeometry, BufferGeometry, BufferAttribute, Float32BufferAttribute,
  MeshPhysicalMaterial, MeshStandardMaterial, PointsMaterial,
  DirectionalLight, AmbientLight, PointLight,
  Vector2, Vector3, Color, Shape, Path, CanvasTexture, PMREMGenerator,
  ACESFilmicToneMapping, SRGBColorSpace, AdditiveBlending, MathUtils
} from "three";
export { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
export { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
export { REVISION } from "three";
