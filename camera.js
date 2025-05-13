class SimpleCamera {
  constructor(position, target) {
    this.fov = 60;
    this.eye = new Vector3(position);
    this.at = new Vector3(target);
    this.up = new Vector3([0, 1, 0]);
    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this.update();
  }

  update() {
    this.viewMatrix.setLookAt(...this.eye.elements, ...this.at.elements, ...this.up.elements);
    this.projectionMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 1000);
  }

  moveForward(speed = 0.2) {
    let f = new Vector3(this.at.elements);
    f.sub(this.eye).normalize().mul(speed);
    this.eye.add(f);
    this.at.add(f);
  }

  moveBackward(speed = 0.2) {
    let b = new Vector3(this.eye.elements);
    b.sub(this.at).normalize().mul(speed);
    this.eye.add(b);
    this.at.add(b);
  }

  moveLeft(speed = 0.2) {
    let f = new Vector3(this.at.elements);
    f.sub(this.eye).normalize();
    let s = Vector3.cross(this.up, f).normalize().mul(speed);
    this.eye.add(s);
    this.at.add(s);
  }

  moveRight(speed = 0.2) {
    let f = new Vector3(this.at.elements);
    f.sub(this.eye).normalize();
    let s = Vector3.cross(f, this.up).normalize().mul(speed);
    this.eye.add(s);
    this.at.add(s);
  }

  panLeft(angle = 5) {
    let f = new Vector3(this.at.elements);
    f.sub(this.eye);
    let rot = new Matrix4().setRotate(angle, ...this.up.elements);
    let f_prime = rot.multiplyVector3(f);
    this.at = new Vector3([
      this.eye.elements[0] + f_prime.elements[0],
      this.eye.elements[1] + f_prime.elements[1],
      this.eye.elements[2] + f_prime.elements[2]
    ]);
  }

  panRight(angle = 5) {
    this.panLeft(-angle);
  }

  pitch(angle) {
    let forward = new Vector3(this.at.elements);
    forward.sub(this.eye);
    let right = Vector3.cross(forward, this.up).normalize();

    let rot = new Matrix4().setRotate(angle, ...right.elements);
    let f_prime = rot.multiplyVector3(forward);

    this.at = new Vector3([
      this.eye.elements[0] + f_prime.elements[0],
      this.eye.elements[1] + f_prime.elements[1],
      this.eye.elements[2] + f_prime.elements[2]
    ]);
  }
}
