function sanitizeDoctor(doctor) {
  const doc = doctor.toObject();
  delete doc.password;
  return doc;
}
function sanitizeDoctors(doctors) {
  return doctors.map(sanitizeDoctor);
}
module.exports = {sanitizeDoctor,sanitizeDoctors}
