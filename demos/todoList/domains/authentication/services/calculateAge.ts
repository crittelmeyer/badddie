export const calculateAge = (birthdate: string) => {
  const birthdateDate = new Date(birthdate)
  const ageDiffMs = Date.now() - birthdateDate.getTime()
  const ageDate = new Date(ageDiffMs) // milliseconds from epoch

  return Math.abs(ageDate.getUTCFullYear() - 1970)
}
