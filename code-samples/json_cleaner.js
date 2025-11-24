/**
 * JSON Cleaner & Normalizer Strategy
 * * This script demonstrates how to handle specific data ingestion challenges
 * from legacy credit bureau APIs (SOAP/XML-to-JSON conversions).
 * * Key features:
 * 1. Defensive Programming: Handles missing keys, null values, and inconsistent data types.
 * 2. Structure Normalization: Flattens nested structures and standardizes arrays/objects.
 * 3. Token Optimization: Reduces payload size for LLM processing by keeping only relevant fields.
 */

// --- HELPER FUNCTIONS ---

/**
 * Parses a monetary string (e.g., "1.234,56") into a float number.
 * Handles locale-specific formatting (Brazilian Portuguese).
 * @param {string} valueStr
 * @returns {number}
 */
function parseMonetaryValue(valueStr) {
  if (typeof valueStr !== "string") return 0;
  // Remove thousand separators (.) and replace decimal separator (,) with dot (.)
  return parseFloat(valueStr.replace(/\./g, "").replace(",", "."));
}

/**
 * Processes a generic detail block from the API response.
 * * The legacy API has inconsistent return types:
 * - Scenario 1: Returns an Array directly.
 * - Scenario 2: Returns a wrapper Object containing the data key.
 * - Scenario 3: Returns a single Object (when only one record exists).
 * * This function unifies all scenarios into a clean Array of Objects.
 * * @param {Array|object} detailBlock - The raw block from the API.
 * @param {string} dataKey - The specific key containing data (for Scenario 2).
 * @param {object} keyMap - A mapping object to rename keys (OldKey -> NewKey).
 * @returns {Array} - A sanitized and formatted array.
 */
function processDetailBlock(detailBlock, dataKey, keyMap) {
  // Guard clause: if block doesn't exist, return empty array.
  if (!detailBlock) {
    return [];
  }

  let rawData;

  // Scenario 1: Block is already an Array
  if (Array.isArray(detailBlock)) {
    rawData = detailBlock;
  }
  // Scenario 2: Block is a wrapper Object containing the specific dataKey
  else if (dataKey && detailBlock.REGISTRO === "S" && detailBlock[dataKey]) {
    rawData = detailBlock[dataKey];
  }
  // Scenario 3: Block is a single Object (Record exists)
  else if (typeof detailBlock === "object" && detailBlock.REGISTRO === "S") {
    rawData = detailBlock;
  }
  // Fallback: No valid records found
  else {
    return [];
  }

  // Force data into an Array structure
  const dataArray = Array.isArray(rawData) ? rawData : [rawData];

  // Map and Clean items
  return dataArray
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;

      const newItem = {};
      for (const oldKey in keyMap) {
        // Skip empty values or placeholders like '-'
        if (item[oldKey] && item[oldKey] !== "-") {
          newItem[keyMap[oldKey]] = item[oldKey];
        }
      }
      return newItem;
    })
    .filter((item) => item !== null && Object.keys(item).length > 0);
}

// --- MAIN TRANSFORMATION LOGIC ---

/**
 * Main function to clean the Credit Bureau JSON payload.
 * @param {object} inputData - The raw JSON response from the API.
 * @returns {object} - The simplified JSON ready for AI analysis.
 */
function cleanCreditData(inputData) {
  // Defensive access to the main data node
  const creditReport = inputData?.body?.["SPCA-XML"]?.RESPOSTA?.ACERTA || {};

  // --- Financial Summary Calculations ---
  const debitSummary = creditReport["RESUMO-OCORRENCIAS-DE-DEBITOS"];

  // Parse quantities (Principal + Guarantor)
  const qtyPrincipal = parseInt(debitSummary?.TOTALDEVEDOR) || 0;
  const qtyGuarantor = parseInt(debitSummary?.TOTALAVALISTA) || 0;
  const combinedDebitQty = qtyPrincipal + qtyGuarantor;

  // Parse values (Principal + Guarantor)
  const valPrincipal = parseMonetaryValue(debitSummary?.VALORACOMULADO);
  const valGuarantor = parseMonetaryValue(debitSummary?.VALORAVALISTA);
  const combinedDebitValue = valPrincipal + valGuarantor;

  // --- Construct Final JSON for AI Context ---
  const aiContextPayload = {
    identification: {
      name: creditReport.IDENTIFICACAO?.NOME,
      document: creditReport.IDENTIFICACAO?.DOCUMENTO,
      birthDate: creditReport.IDENTIFICACAO?.DATANASCIMENTO,
      taxStatus: creditReport.IDENTIFICACAO?.SITUACAORECEITA, // e.g., Regular, Pending
      consumerStatus: creditReport["STATUS-CONSUMIDOR"]?.MENSAGEM,
    },

    location: {
      address: `${creditReport.LOCALIZACAO?.TIPOLOGRADOURO || ""} ${
        creditReport.LOCALIZACAO?.NOMELOGRADOURO || ""
      }, ${creditReport.LOCALIZACAO?.NUMEROLOGRADOURO || ""}`.trim(),
      city: creditReport.LOCALIZACAO?.CIDADE,
      state: creditReport.LOCALIZACAO?.UNIDADEFEDERATIVA,
      zipCode: creditReport.LOCALIZACAO?.CEP,
    },

    financialSummary: {
      totalDebtsQty: combinedDebitQty,
      totalDebtsValue: combinedDebitValue,
      protestsQty: parseInt(
        creditReport["RESUMO-TITULOS-PROTESTADOS"]?.TOTAL || "0"
      ),
      protestsValue: parseMonetaryValue(
        creditReport["RESUMO-TITULOS-PROTESTADOS"]?.VALORACUMULADO
      ),
      legalActionsQty: parseInt(
        creditReport["RESUMO-DE-ACOES-CIVEIS"]?.QUANTIDADE || "0"
      ),
      bouncedChecksQty: parseInt(
        creditReport["RESUMO-DEVOLUCOES-INFORMADAS-PELO-CCF"]
          ?.TOTALOCORRENCAS || "0"
      ),
    },

    // Detail Processing using the helper function
    riskScore: processDetailBlock(
      creditReport["SCORE-CLASSIFICACAO-VARIOS-MODELOS"],
      null,
      {
        NOMESCORE: "scoreName",
        SCORE: "points",
        CLASSIFICACAOALFABETICA: "ratingClass",
        TEXTO: "description",
        DESCRICAONATUREZA: "type",
      }
    ),

    negativeDetails: {
      debts: processDetailBlock(creditReport.DEBITOS, "DEBITO", {
        DATAOCORRENCIA: "date",
        VALOR: "value",
        INFORMANTE: "creditor",
        CONTRATO: "contractId",
      }),
      protests: processDetailBlock(
        creditReport["TITULOS-PROTESTADOS"],
        "TITULO-PROTESTADO",
        {
          DATAOCORRENCIA: "date",
          VALOR: "value",
          CIDADE: "city",
          CARTORIO: "registryOffice",
        }
      ),
      civilActions: processDetailBlock(
        creditReport["RELACAO-DE-ACOES-CIVEIS"],
        "ACAO-CIVEL",
        {
          DATADISTRIBUICAO: "distributionDate",
          VALOR: "value",
          ACAOCIVEL: "actionType",
          AUTOR: "plaintiff",
        }
      ),
      bankruptcy: processDetailBlock(
        creditReport["RELACAO-FALENCIA-RECUPERACAO-JUDICIAL"],
        "FALENCIA-RECUPERACAO-JUDICIAL",
        {
          RAZAOSOCIAL: "companyName",
          TIPOOCORRENCIA: "type",
          DATAOCORRENCIA: "date",
        }
      ),
    },

    corporateParticipation: processDetailBlock(
      creditReport["PARTICIPACOES-DO-DOCUMENTO-CONSULTADO"],
      "PARTICIPACAO-EM-EMPRESA",
      {
        RAZAOSOCIAL: "companyName",
        NUMERODOCUMENTOB: "cnpj",
        FUNCAO: "role",
        DATADEENTRADA: "entryDate",
        VALOREMPERCENTUAL: "ownershipPercentage",
      }
    ),
  };

  return aiContextPayload;
}

// Example usage (mocking the n8n input)
// const result = cleanCreditData(inputData);
// return result;
