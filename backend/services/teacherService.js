const knex = require('../config/database');
const { uploadFile, deleteFile } = require('../config/cloudStorage');
const encrypt = require('../utils/encryption');
const decrypt = require('../utils/decryption');

const TEACHER_PROFILE_TABLE = 'teachers';
const TEACHER_DOCUMENTS_TABLE = 'teacher_documents';
const TEACHER_PAYOUT_DETAILS_TABLE = 'teacher_payout_details';

const teacherService = {
  async getProfileByUserId(userId) {
    const profile = await knex(TEACHER_PROFILE_TABLE).where({ user_id: userId }).first();
    if (!profile) {
      // Optionally create a default profile if none exists
      return knex(TEACHER_PROFILE_TABLE).insert({ user_id: userId }).returning('*');
    }
    return profile;
  },

  async updateProfileByUserId(userId, profileData) {
    const { onboardingStatus, verificationDocs, payoutRegion, payoutMethod, payoutDetails, taxStatus, ...restOfProfileData } = profileData;

    const updateData = {
      ...restOfProfileData,
      updated_at: knex.fn.now(),
    };

    if (onboardingStatus) {
      updateData.onboarding_status = JSON.stringify(onboardingStatus);
    }
    if (verificationDocs) {
      updateData.verification_docs = JSON.stringify(verificationDocs);
    }
    if (payoutRegion) {
      updateData.payout_region = payoutRegion;
    }
    if (payoutMethod) {
      updateData.payout_method = payoutMethod;
    }
    if (payoutDetails) {
      // Encrypt sensitive payout details before storing
      const encryptedPayoutDetails = {};
      for (const key in payoutDetails) {
        if (payoutDetails.hasOwnProperty(key)) {
          encryptedPayoutDetails[key] = encrypt(payoutDetails[key]);
        }
      }
      updateData.payout_details = JSON.stringify(encryptedPayoutDetails);
    }
    if (taxStatus) {
      updateData.tax_status = taxStatus;
    }

    await knex(TEACHER_PROFILE_TABLE).where({ user_id: userId }).update(updateData);
    return this.getProfileByUserId(userId); // Return the updated profile
  },

  async uploadDocument(userId, file, documentType) {
    const teacherProfile = await this.getProfileByUserId(userId);
    const teacherId = teacherProfile.id;

    const s3Key = `teacher_documents/${teacherId}/${documentType}-${Date.now()}-${file.originalname}`;
    const fileUrl = await uploadFile(file.buffer, s3Key, file.mimetype);

    const newDocument = {
      teacher_id: teacherId,
      document_type: documentType,
      file_url: fileUrl,
      file_name: file.originalname,
      mime_type: file.mimetype,
      status: 'PENDING_REVIEW', // Default status
      uploaded_at: knex.fn.now(),
    };

    const [insertedDoc] = await knex(TEACHER_DOCUMENTS_TABLE).insert(newDocument).returning('*');
    return insertedDoc;
  },

  async getDocumentsByUserId(userId) {
    const teacherProfile = await this.getProfileByUserId(userId);
    return knex(TEACHER_DOCUMENTS_TABLE).where({ teacher_id: teacherProfile.id });
  },

  async getDocumentById(userId, documentId) {
    const teacherProfile = await this.getProfileByUserId(userId);
    const document = await knex(TEACHER_DOCUMENTS_TABLE)
      .where({ teacher_id: teacherProfile.id, id: documentId })
      .first();
    if (!document) {
      throw new Error('Document not found.');
    }
    return document;
  },

  async deleteDocument(userId, documentId) {
    const teacherProfile = await this.getProfileByUserId(userId);
    const document = await knex(TEACHER_DOCUMENTS_TABLE)
      .where({ teacher_id: teacherProfile.id, id: documentId })
      .first();

    if (!document) {
      throw new Error('Document not found.');
    }

    // Delete from S3
    const s3Key = document.file_url.split('.com/')[1]; // Extract key from URL
    await deleteFile(s3Key);

    await knex(TEACHER_DOCUMENTS_TABLE).where({ id: documentId }).del();
    return { message: 'Document deleted successfully.' };
  },

  async getPayoutDetailsByUserId(userId) {
    const teacherProfile = await this.getProfileByUserId(userId);
    const payoutDetails = await knex(TEACHER_PAYOUT_DETAILS_TABLE)
      .where({ teacher_id: teacherProfile.id })
      .first();
    
    if (payoutDetails && payoutDetails.payout_details) {
      // Decrypt sensitive payout details before returning
      const decryptedPayoutDetails = {};
      const parsedPayoutDetails = JSON.parse(payoutDetails.payout_details);
      for (const key in parsedPayoutDetails) {
        if (parsedPayoutDetails.hasOwnProperty(key)) {
          decryptedPayoutDetails[key] = decrypt(parsedPayoutDetails[key]);
        }
      }
      payoutDetails.payout_details = JSON.stringify(decryptedPayoutDetails); // Keep as stringified JSON
    }

    return payoutDetails;
  },

  async updatePayoutDetailsByUserId(userId, payoutData) {
    const teacherProfile = await this.getProfileByUserId(userId);

    // Encrypt sensitive payout details before storing
    const encryptedPayoutDetails = {};
    for (const key in payoutData.payout_details) {
      if (payoutData.payout_details.hasOwnProperty(key)) {
        encryptedPayoutDetails[key] = encrypt(payoutData.payout_details[key]);
      }
    }

    const updateData = {
      teacher_id: teacherProfile.id,
      payout_method: payoutData.payout_method,
      payout_region: payoutData.payout_region,
      payout_details: JSON.stringify(encryptedPayoutDetails),
      tax_status: payoutData.tax_status,
      updated_at: knex.fn.now(),
    };

    const existingPayout = await knex(TEACHER_PAYOUT_DETAILS_TABLE).where({ teacher_id: teacherProfile.id }).first();

    if (existingPayout) {
      await knex(TEACHER_PAYOUT_DETAILS_TABLE).where({ teacher_id: teacherProfile.id }).update(updateData);
    } else {
      await knex(TEACHER_PAYOUT_DETAILS_TABLE).insert(updateData);
    }

    return this.getPayoutDetailsByUserId(userId); // Return the updated payout details
  },
};

module.exports = teacherService;

