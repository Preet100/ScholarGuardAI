# Database Design & Schema Specification
## ScholarGuard AI

The relational database architecture is built using SQLAlchemy ORM, supporting SQLite for local zero-configuration execution and PostgreSQL for multi-user production deployments.

```
                              ENTITY-RELATIONSHIP MODEL

  ┌──────────────────┐               ┌──────────────────┐
  │      users       │ 1           * │    documents     │
  ├──────────────────┤───────────────├──────────────────┤
  │ user_id (PK)     │               │ document_id (PK) │
  │ name             │               │ user_id (FK)     │
  │ email            │               │ filename         │
  │ role             │               │ file_path        │
  │ created_at       │               │ file_size_bytes  │
  └──────────────────┘               │ file_hash        │
                                     │ citation_style   │
                                     │ status           │
                                     │ extracted_data   │
                                     └────────┬─────────┘
                                              │ 1
                                              │
                                              │ *
                                     ┌────────┴─────────┐
                                     │     analyses     │
                                     ├──────────────────┤
                                     │ analysis_id (PK) │
                                     │ document_id (FK) │
                                     │ overall_score    │
                                     │ exact_score      │
                                     │ lexical_score    │
                                     │ semantic_score   │
                                     │ result_summary   │
                                     │ created_at       │
                                     └────────┬─────────┘
                                              │ 1
                         ┌────────────────────┼────────────────────┐
                         │ *                  │ *                  │ 1
                         ▼                    ▼                    ▼
             ┌──────────────────────┐ ┌───────────────┐ ┌──────────────────┐
             │  similarity_matches  │ │citation_finds │ │     reports      │
             ├──────────────────────┤ ├───────────────┤ ├──────────────────┤
             │ match_id (PK)        │ │ citation_id PK│ │ report_id (PK)   │
             │ analysis_id (FK)     │ │ analysis_id FK│ │ analysis_id (FK) │
             │ source_paper_id (FK) │ │ raw_text      │ │ report_file_path │
             │ match_method         │ │ author, year  │ │ report_data      │
             │ similarity_score     │ │ doi           │ │ created_at       │
             │ submitted_passage    │ │ status        │ └──────────────────┘
             │ matched_passage      │ │ service       │
             └──────────────────────┘ └───────────────┘
                         │ *
                         │
                         ▼ 1
             ┌──────────────────────┐
             │   research_papers    │
             ├──────────────────────┤
             │ paper_id (PK)        │
             │ title, authors       │
             │ year, doi            │
             │ abstract, source     │
             └──────────┬───────────┘
                        │ 1
                        │ *
             ┌──────────┴───────────┐
             │   corpus_passages    │
             ├──────────────────────┤
             │ passage_id (PK)      │
             │ paper_id (FK)        │
             │ passage_index        │
             │ content              │
             └──────────────────────┘
```

### Table Definitions
1. **`documents`**: Stores uploaded manuscript metadata, file hashes, and structured parsing outputs.
2. **`research_papers`**: Stores academic reference works, authors, years, DOIs, and abstracts.
3. **`corpus_passages`**: Granular sentence/passage chunks indexed for fast similarity retrieval.
4. **`analyses`**: Stores composite similarity indicators, total sentence counts, and issue summaries.
5. **`similarity_matches`**: Preserves individual match evidence connecting submitted passages to source passages.
6. **`citation_findings`**: Logs in-text and bibliographic citations with Crossref/OpenAlex verification results.
7. **`reports`**: Stores the full 11-section consolidated JSON audit report.
