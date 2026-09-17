'use strict';

/**
 * The preloaded state stores a cache of GraphQL query results keyed by
 * queryKey. The build page's own data lives under the query keyed
 * "ngf-ug-featured-document-page", at:
 *   state.data[*].game.documents.userGeneratedDocumentBySlug.data
 */
function findBuildDocument(preloadedState) {
  const queries = preloadedState?.diablo4State?.apollo?.graphqlV2?.queries || [];

  for (const query of queries) {
    if (query?.queryKey?.[0] !== 'ngf-ug-featured-document-page') continue;

    const entries = query?.state?.data || [];
    for (const entry of entries) {
      const doc = entry?.game?.documents?.userGeneratedDocumentBySlug?.data;
      if (doc) return doc;
    }
  }

  return null;
}

module.exports = { findBuildDocument };
