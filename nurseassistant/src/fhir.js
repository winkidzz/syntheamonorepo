export function getDemographicsFromFHIR(data) {
  const patient = data?.entry?.find(e => e.resource?.resourceType === "Patient")?.resource;
  if (!patient) return {};
  const name = patient.name?.[0]?.text || `${patient.name?.[0]?.given?.join(" ")} ${patient.name?.[0]?.family}` || "-";
  const gender = patient.gender || "-";
  const birthDate = patient.birthDate || "-";
  let age = "-";
  if (birthDate && birthDate !== "-") {
    try {
      age = new Date().getFullYear() - parseInt(birthDate.split("-")[0], 10);
    } catch {}
  }
  return { name, gender, age };
} 