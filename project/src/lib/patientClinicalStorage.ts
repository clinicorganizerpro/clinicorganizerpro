import type { Anamnesis, Medication, Prescription, ProcedurePhoto } from '../types';

const PRESCRIPTION_STORAGE_KEY = 'prescriptions';
const PROCEDURE_PHOTO_STORAGE_KEY = 'procedure-photos';
const ANAMNESIS_STORAGE_KEY = 'anamneses';

type RecordInput = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === '[object Object]';
};

const getStorageKey = (key: string, userId?: string) => {
  return userId ? `${key}:${userId}` : key;
};

const getCurrentTimestamp = () => new Date().toISOString();

const getTodayKey = () => new Date().toISOString().split('T')[0];

const readString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return '';
};

const normalizeStringList = (value: unknown): string[] => {
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      return normalizeStringList(JSON.parse(value));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim()))
    .filter(Boolean);
};

const parseJsonObject = (value: unknown): RecordInput => {
  if (isPlainObject(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const parseJsonList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeMedication = (value: unknown): Medication => {
  if (!isPlainObject(value)) {
    const name = readString(value);
    return { name, dosage: '', frequency: '', duration: '' };
  }

  return {
    name: readString(value.name, value.medicine, value.medication),
    dosage: readString(value.dosage, value.dose),
    frequency: readString(value.frequency),
    duration: readString(value.duration, value.period),
  };
};

const normalizeMedicationList = (value: unknown): Medication[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => normalizeMedication(entry));
};

const normalizeVitalSigns = (value: unknown): Anamnesis['vitalSigns'] => {
  if (!isPlainObject(value)) {
    return {};
  }

  const vitalSigns: Anamnesis['vitalSigns'] = {};

  const bloodPressure = readString(value.bloodPressure, value.blood_pressure);
  const heartRate = readString(value.heartRate, value.heart_rate);
  const temperature = readString(value.temperature);
  const weight = readString(value.weight);

  if (bloodPressure) {
    vitalSigns.bloodPressure = bloodPressure;
  }

  if (heartRate) {
    vitalSigns.heartRate = heartRate;
  }

  if (temperature) {
    vitalSigns.temperature = temperature;
  }

  if (weight) {
    vitalSigns.weight = weight;
  }

  return vitalSigns;
};

const buildVitalSigns = (value: unknown): Anamnesis['vitalSigns'] => {
  return normalizeVitalSigns(value);
};

const normalizeFacialAssessment = (value: unknown): Anamnesis['facialAssessment'] => {
  const source = parseJsonObject(value);

  return {
    skinType: readString(source.skinType, source.skin_type),
    fitzpatrick: readString(source.fitzpatrick),
    acne: readString(source.acne),
    melasma: Boolean(source.melasma),
    rosacea: Boolean(source.rosacea),
    sagging: Boolean(source.sagging),
    fineLines: Boolean(source.fineLines ?? source.fine_lines),
    deepWrinkles: Boolean(source.deepWrinkles ?? source.deep_wrinkles),
    facialAsymmetry: Boolean(source.facialAsymmetry ?? source.facial_asymmetry),
    doubleChin: Boolean(source.doubleChin ?? source.double_chin),
    facialVolumeLoss: Boolean(source.facialVolumeLoss ?? source.facial_volume_loss),
    skinQuality: readString(source.skinQuality, source.skin_quality),
    sensitivity: readString(source.sensitivity),
    scars: Boolean(source.scars),
    enlargedPores: Boolean(source.enlargedPores ?? source.enlarged_pores),
    oiliness: readString(source.oiliness),
    agingDegree: readString(source.agingDegree, source.aging_degree),
  };
};

const normalizeProcedureDetails = (value: unknown): Anamnesis['procedureDetails'] => {
  return parseJsonObject(value) as Anamnesis['procedureDetails'];
};

const readStoredRecords = <T>(storageKey: string, normalize: (value: unknown) => T | null, userId?: string): T[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(storageKey, userId));

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalize).filter((record): record is T => record !== null);
  } catch {
    return [];
  }
};

const writeStoredRecords = <T>(storageKey: string, records: T[], userId?: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getStorageKey(storageKey, userId), JSON.stringify(records));
};

const generateId = (prefix: string) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const normalizePrescription = (value: unknown): Prescription | null => {
  if (!isPlainObject(value)) {
    return null;
  }

  if (typeof value.id !== 'string' || !value.id.trim()) {
    return null;
  }

  return {
    id: value.id,
    patientId: readString(value.patientId, value.patient_id),
    date: readString(value.date) || getTodayKey(),
    medications: normalizeMedicationList(value.medications ?? value.items ?? value.medicines),
    instructions: readString(value.instructions, value.notes),
    createdAt: readString(value.createdAt, value.created_at) || getCurrentTimestamp(),
  };
};

const buildPrescription = (
  payload: RecordInput,
  overrides: { id?: string; createdAt?: string } = {},
): Prescription => {
  const id = overrides.id ?? (readString(payload.id) || generateId('prescription'));
  const createdAt = overrides.createdAt ?? (readString(payload.createdAt, payload.created_at) || getCurrentTimestamp());

  return {
    id,
    patientId: readString(payload.patientId, payload.patient_id),
    date: readString(payload.date) || getTodayKey(),
    medications: normalizeMedicationList(payload.medications ?? payload.items ?? payload.medicines),
    instructions: readString(payload.instructions, payload.notes),
    createdAt,
  };
};

const normalizeProcedurePhoto = (value: unknown): ProcedurePhoto | null => {
  if (!isPlainObject(value)) {
    return null;
  }

  if (typeof value.id !== 'string' || !value.id.trim()) {
    return null;
  }

  return {
    id: value.id,
    patientId: readString(value.patientId, value.patient_id),
    procedureName: readString(value.procedureName, value.procedure_name),
    photosBefore: normalizeStringList(value.photosBefore ?? value.photos_before),
    photosAfter: normalizeStringList(value.photosAfter ?? value.photos_after),
    videoUrl: readString(value.videoUrl, value.video_url),
    videosBefore: normalizeStringList(value.videosBefore ?? value.videos_before),
    videosAfter: normalizeStringList(value.videosAfter ?? value.videos_after),
    observations: readString(value.observations, value.notes),
    createdAt: readString(value.createdAt, value.created_at) || getCurrentTimestamp(),
  };
};

const buildProcedurePhoto = (
  payload: RecordInput,
  overrides: { id?: string; createdAt?: string } = {},
): ProcedurePhoto => {
  const id = overrides.id ?? (readString(payload.id) || generateId('procedure-photo'));
  const createdAt = overrides.createdAt ?? (readString(payload.createdAt, payload.created_at) || getCurrentTimestamp());

  return {
    id,
    patientId: readString(payload.patientId, payload.patient_id),
    procedureName: readString(payload.procedureName, payload.procedure_name),
    photosBefore: normalizeStringList(payload.photosBefore ?? payload.photos_before),
    photosAfter: normalizeStringList(payload.photosAfter ?? payload.photos_after),
    videoUrl: readString(payload.videoUrl, payload.video_url),
    videosBefore: normalizeStringList(payload.videosBefore ?? payload.videos_before),
    videosAfter: normalizeStringList(payload.videosAfter ?? payload.videos_after),
    observations: readString(payload.observations, payload.notes),
    createdAt,
  };
};

const normalizeAnamnesis = (value: unknown): Anamnesis | null => {
  if (!isPlainObject(value)) {
    return null;
  }

  if (typeof value.id !== 'string' || !value.id.trim()) {
    return null;
  }

  return {
    id: value.id,
    patientId: readString(value.patientId, value.patient_id),
    date: readString(value.date) || getTodayKey(),
    mainComplaint: readString(value.mainComplaint, value.main_complaint),
    medicalHistory: readString(value.medicalHistory, value.medical_history),
    allergies: readString(value.allergies),
    currentMedications: readString(value.currentMedications, value.current_medications),
    familyHistory: readString(value.familyHistory, value.family_history),
    socialHistory: readString(value.socialHistory, value.social_history),
    previousSurgeries: readString(value.previousSurgeries, value.previous_surgeries),
    vitalSigns: normalizeVitalSigns(parseJsonObject(value.vitalSigns ?? value.vital_signs)),
    observations: readString(value.observations, value.notes),
    facialAssessment: normalizeFacialAssessment(value.facialAssessment ?? value.facial_assessment),
    estheticProcedures: normalizeStringList(parseJsonList(value.estheticProcedures ?? value.esthetic_procedures)),
    procedureDetails: normalizeProcedureDetails(value.procedureDetails ?? value.procedure_details),
    clinicalNotes: readString(value.clinicalNotes, value.clinical_notes),
    aestheticPhotosBefore: normalizeStringList(value.aestheticPhotosBefore ?? value.aesthetic_photos_before),
    aestheticPhotosAfter: normalizeStringList(value.aestheticPhotosAfter ?? value.aesthetic_photos_after),
    digitalSignature: readString(value.digitalSignature, value.digital_signature),
    signatureDate: readString(value.signatureDate, value.signature_date),
    createdAt: readString(value.createdAt, value.created_at) || getCurrentTimestamp(),
  };
};

const buildAnamnesis = (
  payload: RecordInput,
  overrides: { id?: string; createdAt?: string } = {},
): Anamnesis => {
  const id = overrides.id ?? (readString(payload.id) || generateId('anamnesis'));
  const createdAt = overrides.createdAt ?? (readString(payload.createdAt, payload.created_at) || getCurrentTimestamp());

  return {
    id,
    patientId: readString(payload.patientId, payload.patient_id),
    date: readString(payload.date) || getTodayKey(),
    mainComplaint: readString(payload.mainComplaint, payload.main_complaint),
    medicalHistory: readString(payload.medicalHistory, payload.medical_history),
    allergies: readString(payload.allergies),
    currentMedications: readString(payload.currentMedications, payload.current_medications),
    familyHistory: readString(payload.familyHistory, payload.family_history),
    socialHistory: readString(payload.socialHistory, payload.social_history),
    previousSurgeries: readString(payload.previousSurgeries, payload.previous_surgeries),
    vitalSigns: buildVitalSigns(parseJsonObject(payload.vitalSigns ?? payload.vital_signs)),
    observations: readString(payload.observations, payload.notes),
    facialAssessment: normalizeFacialAssessment(payload.facialAssessment ?? payload.facial_assessment),
    estheticProcedures: normalizeStringList(parseJsonList(payload.estheticProcedures ?? payload.esthetic_procedures)),
    procedureDetails: normalizeProcedureDetails(payload.procedureDetails ?? payload.procedure_details),
    clinicalNotes: readString(payload.clinicalNotes, payload.clinical_notes),
    aestheticPhotosBefore: normalizeStringList(payload.aestheticPhotosBefore ?? payload.aesthetic_photos_before),
    aestheticPhotosAfter: normalizeStringList(payload.aestheticPhotosAfter ?? payload.aesthetic_photos_after),
    digitalSignature: readString(payload.digitalSignature, payload.digital_signature),
    signatureDate: readString(payload.signatureDate, payload.signature_date),
    createdAt,
  };
};

export function carregarReceitasClinicas(userId?: string): Prescription[] {
  return readStoredRecords(PRESCRIPTION_STORAGE_KEY, normalizePrescription, userId);
}

export function salvarReceitasClinicas(receitas: Prescription[], userId?: string): Prescription[] {
  writeStoredRecords(PRESCRIPTION_STORAGE_KEY, receitas, userId);
  return receitas;
}

export function salvarReceitaClinica(receita: Prescription, userId?: string): Prescription {
  const receitas = carregarReceitasClinicas(userId);
  const nextReceita = {
    ...receita,
    createdAt: receita.createdAt ?? getCurrentTimestamp(),
  };

  const index = receitas.findIndex((storedPrescription) => storedPrescription.id === nextReceita.id);

  if (index === -1) {
    receitas.push(nextReceita);
  } else {
    receitas[index] = nextReceita;
  }

  writeStoredRecords(PRESCRIPTION_STORAGE_KEY, receitas, userId);
  return nextReceita;
}

export function atualizarReceitaClinica(id: string, updates: Partial<Prescription>, userId?: string): Prescription | null {
  const receitas = carregarReceitasClinicas(userId);
  const index = receitas.findIndex((receita) => receita.id === id);

  if (index === -1) {
    return null;
  }

  const updatedPrescription: Prescription = {
    ...receitas[index],
    ...updates,
    patientId: typeof updates.patientId === 'string' ? updates.patientId : receitas[index].patientId,
    date: typeof updates.date === 'string' ? updates.date : receitas[index].date,
    medications: Array.isArray(updates.medications) ? updates.medications.map(normalizeMedication) : receitas[index].medications,
    instructions: typeof updates.instructions === 'string' ? updates.instructions : receitas[index].instructions,
    createdAt: updates.createdAt ?? receitas[index].createdAt,
  };

  receitas[index] = updatedPrescription;
  writeStoredRecords(PRESCRIPTION_STORAGE_KEY, receitas, userId);
  return updatedPrescription;
}

export function removerReceitaClinica(id: string, userId?: string): boolean {
  const receitas = carregarReceitasClinicas(userId);
  const nextReceitas = receitas.filter((receita) => receita.id !== id);

  if (nextReceitas.length === receitas.length) {
    return false;
  }

  writeStoredRecords(PRESCRIPTION_STORAGE_KEY, nextReceitas, userId);
  return true;
}

export function criarReceitaClinicaLocal(
  payload: RecordInput,
  overrides: { id?: string; createdAt?: string } = {},
): Prescription {
  return buildPrescription(payload, overrides);
}

export function carregarFotosProcedimento(userId?: string): ProcedurePhoto[] {
  return readStoredRecords(PROCEDURE_PHOTO_STORAGE_KEY, normalizeProcedurePhoto, userId);
}

export function salvarFotosProcedimento(fotos: ProcedurePhoto[], userId?: string): ProcedurePhoto[] {
  writeStoredRecords(PROCEDURE_PHOTO_STORAGE_KEY, fotos, userId);
  return fotos;
}

export function salvarFotoProcedimento(foto: ProcedurePhoto, userId?: string): ProcedurePhoto {
  const fotos = carregarFotosProcedimento(userId);
  const nextFoto = {
    ...foto,
    createdAt: foto.createdAt ?? getCurrentTimestamp(),
  };

  const index = fotos.findIndex((storedPhoto) => storedPhoto.id === nextFoto.id);

  if (index === -1) {
    fotos.push(nextFoto);
  } else {
    fotos[index] = nextFoto;
  }

  writeStoredRecords(PROCEDURE_PHOTO_STORAGE_KEY, fotos, userId);
  return nextFoto;
}

export function atualizarFotoProcedimento(
  id: string,
  updates: Partial<ProcedurePhoto>,
  userId?: string,
): ProcedurePhoto | null {
  const fotos = carregarFotosProcedimento(userId);
  const index = fotos.findIndex((foto) => foto.id === id);

  if (index === -1) {
    return null;
  }

  const updatedPhoto: ProcedurePhoto = {
    ...fotos[index],
    ...updates,
    patientId: typeof updates.patientId === 'string' ? updates.patientId : fotos[index].patientId,
    procedureName: typeof updates.procedureName === 'string' ? updates.procedureName : fotos[index].procedureName,
    photosBefore: Array.isArray(updates.photosBefore) ? normalizeStringList(updates.photosBefore) : fotos[index].photosBefore,
    photosAfter: Array.isArray(updates.photosAfter) ? normalizeStringList(updates.photosAfter) : fotos[index].photosAfter,
    videoUrl: typeof updates.videoUrl === 'string' ? updates.videoUrl : fotos[index].videoUrl,
    videosBefore: Array.isArray(updates.videosBefore) ? normalizeStringList(updates.videosBefore) : fotos[index].videosBefore,
    videosAfter: Array.isArray(updates.videosAfter) ? normalizeStringList(updates.videosAfter) : fotos[index].videosAfter,
    observations: typeof updates.observations === 'string' ? updates.observations : fotos[index].observations,
    createdAt: updates.createdAt ?? fotos[index].createdAt,
  };

  fotos[index] = updatedPhoto;
  writeStoredRecords(PROCEDURE_PHOTO_STORAGE_KEY, fotos, userId);
  return updatedPhoto;
}

export function removerFotoProcedimento(id: string, userId?: string): boolean {
  const fotos = carregarFotosProcedimento(userId);
  const nextFotos = fotos.filter((foto) => foto.id !== id);

  if (nextFotos.length === fotos.length) {
    return false;
  }

  writeStoredRecords(PROCEDURE_PHOTO_STORAGE_KEY, nextFotos, userId);
  return true;
}

export function criarFotoProcedimentoLocal(
  payload: RecordInput,
  overrides: { id?: string; createdAt?: string } = {},
): ProcedurePhoto {
  return buildProcedurePhoto(payload, overrides);
}

export function carregarAnamnesesClinicas(userId?: string): Anamnesis[] {
  return readStoredRecords(ANAMNESIS_STORAGE_KEY, normalizeAnamnesis, userId);
}

export function salvarAnamnesesClinicas(anamneses: Anamnesis[], userId?: string): Anamnesis[] {
  writeStoredRecords(ANAMNESIS_STORAGE_KEY, anamneses, userId);
  return anamneses;
}

export function salvarAnamneseClinica(anamnese: Anamnesis, userId?: string): Anamnesis {
  const anamneses = carregarAnamnesesClinicas(userId);
  const nextAnamnese = {
    ...anamnese,
    createdAt: anamnese.createdAt ?? getCurrentTimestamp(),
  };

  const index = anamneses.findIndex((storedAnamnesis) => storedAnamnesis.id === nextAnamnese.id);

  if (index === -1) {
    anamneses.push(nextAnamnese);
  } else {
    anamneses[index] = nextAnamnese;
  }

  writeStoredRecords(ANAMNESIS_STORAGE_KEY, anamneses, userId);
  return nextAnamnese;
}

export function atualizarAnamneseClinica(
  id: string,
  updates: Partial<Anamnesis>,
  userId?: string,
): Anamnesis | null {
  const anamneses = carregarAnamnesesClinicas(userId);
  const index = anamneses.findIndex((anamnesis) => anamnesis.id === id);

  if (index === -1) {
    return null;
  }

  const updatedAnamnesis: Anamnesis = {
    ...anamneses[index],
    ...updates,
    patientId: typeof updates.patientId === 'string' ? updates.patientId : anamneses[index].patientId,
    date: typeof updates.date === 'string' ? updates.date : anamneses[index].date,
    mainComplaint: typeof updates.mainComplaint === 'string' ? updates.mainComplaint : anamneses[index].mainComplaint,
    medicalHistory: typeof updates.medicalHistory === 'string' ? updates.medicalHistory : anamneses[index].medicalHistory,
    allergies: typeof updates.allergies === 'string' ? updates.allergies : anamneses[index].allergies,
    currentMedications:
      typeof updates.currentMedications === 'string' ? updates.currentMedications : anamneses[index].currentMedications,
    familyHistory: typeof updates.familyHistory === 'string' ? updates.familyHistory : anamneses[index].familyHistory,
    socialHistory: typeof updates.socialHistory === 'string' ? updates.socialHistory : anamneses[index].socialHistory,
    previousSurgeries:
      typeof updates.previousSurgeries === 'string' ? updates.previousSurgeries : anamneses[index].previousSurgeries,
    vitalSigns: isPlainObject(updates.vitalSigns) ? buildVitalSigns(updates.vitalSigns) : anamneses[index].vitalSigns,
    observations: typeof updates.observations === 'string' ? updates.observations : anamneses[index].observations,
    facialAssessment: updates.facialAssessment ? normalizeFacialAssessment(updates.facialAssessment) : anamneses[index].facialAssessment,
    estheticProcedures: Array.isArray(updates.estheticProcedures)
      ? normalizeStringList(updates.estheticProcedures)
      : anamneses[index].estheticProcedures,
    procedureDetails: updates.procedureDetails ? normalizeProcedureDetails(updates.procedureDetails) : anamneses[index].procedureDetails,
    clinicalNotes: typeof updates.clinicalNotes === 'string' ? updates.clinicalNotes : anamneses[index].clinicalNotes,
    aestheticPhotosBefore: Array.isArray(updates.aestheticPhotosBefore)
      ? normalizeStringList(updates.aestheticPhotosBefore)
      : anamneses[index].aestheticPhotosBefore,
    aestheticPhotosAfter: Array.isArray(updates.aestheticPhotosAfter)
      ? normalizeStringList(updates.aestheticPhotosAfter)
      : anamneses[index].aestheticPhotosAfter,
    digitalSignature: typeof updates.digitalSignature === 'string' ? updates.digitalSignature : anamneses[index].digitalSignature,
    signatureDate: typeof updates.signatureDate === 'string' ? updates.signatureDate : anamneses[index].signatureDate,
    createdAt: updates.createdAt ?? anamneses[index].createdAt,
  };

  anamneses[index] = updatedAnamnesis;
  writeStoredRecords(ANAMNESIS_STORAGE_KEY, anamneses, userId);
  return updatedAnamnesis;
}

export function removerAnamneseClinica(id: string, userId?: string): boolean {
  const anamneses = carregarAnamnesesClinicas(userId);
  const nextAnamneses = anamneses.filter((anamnesis) => anamnesis.id !== id);

  if (nextAnamneses.length === anamneses.length) {
    return false;
  }

  writeStoredRecords(ANAMNESIS_STORAGE_KEY, nextAnamneses, userId);
  return true;
}

export function criarAnamneseClinicaLocal(
  payload: RecordInput,
  overrides: { id?: string; createdAt?: string } = {},
): Anamnesis {
  return buildAnamnesis(payload, overrides);
}
