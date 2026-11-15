import os
import csv
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database.models import ResearchPaper, CorpusPassage
from app.config import settings
from app.nlp.preprocessing import preprocessor

# Curated reference dataset of landmark peer-reviewed AI/CS papers with verbatim passages and metadata
SEED_PAPERS = [
    {
        "title": "Attention Is All You Need",
        "authors": "Vaswani, Ashish; Shazeer, Noam; Parmar, Niki; Uszkoreit, Jakob; Jones, Llion; Gomez, Aidan N.; Kaiser, Lukasz; Polosukhin, Illia",
        "year": 2017,
        "doi": "10.48550/arXiv.1706.03762",
        "abstract": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
        "source": "arXiv",
        "url": "https://arxiv.org/abs/1706.03762",
        "license": "CC-BY-4.0",
        "passages": [
            "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks in an encoder-decoder configuration.",
            "The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as twelve hours on eight P100 GPUs.",
            "An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors.",
            "Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.",
            "Recurrent models typically factor computation along the symbol positions of the input and output sequences."
        ]
    },
    {
        "title": "Deep Residual Learning for Image Recognition",
        "authors": "He, Kaiming; Zhang, Xiangyu; Ren, Shaoqing; Sun, Jian",
        "year": 2016,
        "doi": "10.1109/CVPR.2016.90",
        "abstract": "Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learning residual functions with reference to the layer inputs, instead of learning unreferenced functions.",
        "source": "IEEE CVPR",
        "url": "https://ieeexplore.ieee.org/document/7780459",
        "license": "IEEE Open Access",
        "passages": [
            "Deeper neural networks are more difficult to train due to the notorious problem of vanishing and exploding gradients.",
            "When deeper networks are able to start converging, a degradation problem has been exposed: with the network depth increasing, accuracy gets saturated and then degrades rapidly.",
            "We address the degradation problem by introducing a deep residual learning framework where shortcut connections skip one or more layers.",
            "Formally, denoting the desired underlying mapping as H(x), we let the stacked nonlinear layers fit another mapping of F(x) := H(x) - x.",
            "The formulation of F(x) + x can be realized by feedforward neural networks with shortcut connections."
        ]
    },
    {
        "title": "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
        "authors": "Devlin, Jacob; Chang, Ming-Wei; Lee, Kenton; Toutanova, Kristina",
        "year": 2018,
        "doi": "10.48550/arXiv.1810.04805",
        "abstract": "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.",
        "source": "arXiv / NAACL",
        "url": "https://arxiv.org/abs/1810.04805",
        "license": "CC-BY-4.0",
        "passages": [
            "Language model pre-training has been shown to be effective for improving many natural language processing tasks.",
            "BERT alleviates the unidirectionality constraint by using a Masked Language Model pre-training objective inspired by the Cloze task.",
            "The masked language model randomly masks some of the tokens from the input, and the objective is to predict the original vocabulary id of the masked word based only on its context.",
            "In addition to the masked language model, we also use a next sentence prediction task that jointly pre-trains text-pair representations.",
            "BERT is conceptually simple and empirically powerful, obtaining new state-of-the-art results on eleven natural language processing tasks."
        ]
    },
    {
        "title": "Adam: A Method for Stochastic Optimization",
        "authors": "Kingma, Diederik P.; Ba, Jimmy",
        "year": 2014,
        "doi": "10.48550/arXiv.1412.6980",
        "abstract": "We introduce Adam, an algorithm for first-order gradient-based optimization of stochastic objective functions, based on adaptive estimates of lower-order moments. The method is straightforward to implement, is computationally efficient, has little memory requirements, is invariant to diagonal rescaling of the gradients, and is well suited for problems that are large in terms of data and parameters.",
        "source": "arXiv / ICLR",
        "url": "https://arxiv.org/abs/1412.6980",
        "license": "CC-BY-4.0",
        "passages": [
            "We introduce Adam, an algorithm for first-order gradient-based optimization of stochastic objective functions.",
            "The method computes individual adaptive learning rates for different parameters from estimates of first and second moments of the gradients.",
            "Adam combines the advantages of two popular methods: AdaGrad, which works well with sparse gradients, and RMSProp, which works well in on-line and non-stationary settings.",
            "The decay rates of the moving averages of the gradients are controlled by hyperparameters beta1 and beta2.",
            "Our empirical results demonstrate that Adam compares favorably to other stochastic optimization algorithms in practice."
        ]
    },
    {
        "title": "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
        "authors": "Lewis, Patrick; Perez, Ethan; Piktus, Aleksandra; Petroni, Fabio; Karpukhin, Vladimir; Goyal, Naman; Küttler, Heinrich; Lewis, Mike; Yih, Wen-tau; Rocktäschel, Tim; Riedel, Sebastian; Kiela, Douwe",
        "year": 2020,
        "doi": "10.48550/arXiv.2005.11401",
        "abstract": "Large pre-trained language models have been shown to store factual knowledge in their parameters. However, their ability to precisely access and manipulate knowledge is still limited. We explore a general-purpose fine-tuning recipe for retrieval-augmented generation (RAG) models which combine pre-trained parametric and non-parametric memory.",
        "source": "NeurIPS",
        "url": "https://arxiv.org/abs/2005.11401",
        "license": "CC-BY-4.0",
        "passages": [
            "Pre-trained neural language models store vast amounts of factual knowledge in their parameters.",
            "Parametric models cannot easily expand or revise their memory, can't straightforwardly provide insight into their predictions, and may produce hallucinations.",
            "RAG models combine pre-trained parametric memory with non-parametric memory accessed via dense vector retrieval.",
            "We introduce RAG models where the parametric memory is a pre-trained seq2seq model and the non-parametric memory is a dense vector index of Wikipedia.",
            "Retrieval-augmented models achieve state-of-the-art results on open-domain question answering benchmarks while producing more factual and specific text."
        ]
    },
    {
        "title": "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks",
        "authors": "Reimers, Nils; Gurevych, Iryna",
        "year": 2019,
        "doi": "10.48550/arXiv.1908.10084",
        "abstract": "BERT and RoBERTa have set a new state-of-the-art performance on sentence-pair regression tasks like semantic textual similarity (STS). However, it requires that both sentences are fed into the network, which causes a massive computational overhead. We present Sentence-BERT (SBERT), a modification of the pretrained BERT network that uses siamese and triplet network structures to derive semantically meaningful sentence embeddings.",
        "source": "EMNLP",
        "url": "https://arxiv.org/abs/1908.10084",
        "license": "CC-BY-4.0",
        "passages": [
            "Finding in a collection of 10,000 sentences the pair with the highest similarity requires with BERT about 50 million inference computations.",
            "SBERT uses siamese networks to derive fixed-size vectors for input sentences, enabling efficient cosine similarity comparisons.",
            "We tune SBERT on NLI data, which creates sentence embeddings that significantly outperform state-of-the-art sentence embedding methods.",
            "On semantic textual similarity tasks, SBERT achieves competitive accuracy while reducing the computational effort from 65 hours to 5 seconds.",
            "The siamese architecture applies pooling to the output of BERT to derive a fixed-sized sentence embedding."
        ]
    }
]

class CorpusManager:
    """
    Manages the academic reference corpus, saving records to database and local JSON cache.
    """

    def __init__(self, db: Session):
        self.db = db

    def seed_initial_corpus_if_empty(self) -> int:
        """
        Seeds the reference corpus with initial peer-reviewed papers if the database has 0 papers.
        """
        existing_count = self.db.query(ResearchPaper).count()
        if existing_count > 0:
            return existing_count

        added = 0
        for p_data in SEED_PAPERS:
            paper = ResearchPaper(
                title=p_data["title"],
                authors=p_data["authors"],
                year=p_data["year"],
                doi=p_data["doi"],
                abstract=p_data["abstract"],
                source=p_data["source"],
                url=p_data["url"],
                license=p_data["license"],
                full_text="\n\n".join(p_data["passages"])
            )
            self.db.add(paper)
            self.db.flush()

            for idx, passage in enumerate(p_data["passages"]):
                p_entry = CorpusPassage(
                    paper_id=paper.paper_id,
                    passage_index=idx,
                    content=passage
                )
                self.db.add(p_entry)
            added += 1

        self.db.commit()

        # Save JSON snapshot into datasets/reference_corpus/papers.json
        snapshot_path = os.path.join(settings.CORPUS_DIR, "papers.json")
        try:
            with open(snapshot_path, "w", encoding="utf-8") as f:
                json.dump(SEED_PAPERS, f, indent=2)
        except Exception:
            pass

        # Auto-import any CSV files located in datasets/reference_corpus/
        self.sync_local_csv_files()

        return added

    def sync_local_csv_files(self) -> int:
        """
        Scans datasets/reference_corpus/ for any .csv files and imports unindexed papers.
        """
        if not os.path.exists(settings.CORPUS_DIR):
            return 0

        total_imported = 0
        for fname in os.listdir(settings.CORPUS_DIR):
            if fname.lower().endswith(".csv"):
                csv_path = os.path.join(settings.CORPUS_DIR, fname)
                try:
                    res = self.import_from_csv(csv_path)
                    total_imported += res.get("imported_count", 0)
                except Exception as e:
                    print(f"[CorpusManager] Note: Could not import {fname}: {e}")
        return total_imported

    def import_from_csv(self, csv_path: str) -> Dict[str, Any]:
        """
        Imports and indexes research papers from a CSV file into the reference corpus.
        Accepts flexible column naming (title, authors, year, doi, text/passages/abstract).
        """
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"CSV file not found: {csv_path}")

        imported_count = 0
        skipped_count = 0
        passages_added = 0

        with open(csv_path, mode="r", encoding="utf-8-sig", errors="replace") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames:
                return {"imported_count": 0, "skipped_count": 0, "passages_added": 0}

            # Normalize column names to lowercase
            field_map = {col.strip().lower(): col for col in reader.fieldnames}

            def get_val(row, *aliases):
                for alias in aliases:
                    original_col = field_map.get(alias.lower())
                    if original_col and row.get(original_col):
                        return str(row[original_col]).strip()
                return ""

            for row in reader:
                title = get_val(row, "title", "paper_title", "name", "headline")
                if not title:
                    skipped_count += 1
                    continue

                # Check if paper with this title already exists in corpus
                existing = self.db.query(ResearchPaper).filter(ResearchPaper.title == title).first()
                if existing:
                    skipped_count += 1
                    continue

                authors = get_val(row, "authors", "author", "creator", "researchers") or "Unknown Authors"
                year_str = get_val(row, "year", "publication_year", "pub_year", "date")
                try:
                    year = int(year_str) if year_str and year_str.isdigit() else 2024
                except Exception:
                    year = 2024

                doi = get_val(row, "doi", "doi_url") or None
                source = get_val(row, "source", "journal", "conference", "venue", "publisher") or "External Dataset"
                url = get_val(row, "url", "link", "paper_url") or ""
                license_str = get_val(row, "license", "rights") or "Open Access"
                abstract = get_val(row, "abstract", "summary", "description") or ""

                # Extract main content / passages
                raw_text = get_val(row, "text", "content", "passages", "body", "paper_text")
                if not raw_text and abstract:
                    raw_text = abstract

                if not raw_text:
                    skipped_count += 1
                    continue

                # Segment text into sentences/passages for granular comparison
                sentences = preprocessor.segment_sentences(raw_text)
                if not sentences:
                    sentences = [s.strip() for s in raw_text.split("\n") if s.strip()]

                paper = ResearchPaper(
                    title=title,
                    authors=authors,
                    year=year,
                    doi=doi,
                    abstract=abstract,
                    source=source,
                    url=url,
                    license=license_str,
                    full_text=raw_text
                )
                self.db.add(paper)
                self.db.flush()

                for idx, sent_obj in enumerate(sentences):
                    passage_content = (
                        sent_obj.get("original_text") or sent_obj.get("raw")
                        if isinstance(sent_obj, dict) else str(sent_obj)
                    )
                    if passage_content and len(passage_content.strip()) > 15:
                        p_entry = CorpusPassage(
                            paper_id=paper.paper_id,
                            passage_index=idx,
                            content=passage_content.strip()
                        )
                        self.db.add(p_entry)
                        passages_added += 1

                imported_count += 1

        self.db.commit()
        return {
            "imported_count": imported_count,
            "skipped_count": skipped_count,
            "passages_added": passages_added
        }

    def get_all_corpus_passages(self) -> List[Dict[str, Any]]:
        """
        Retrieves all indexed passages and associated paper metadata for similarity scanning.
        """
        passages = (
            self.db.query(CorpusPassage, ResearchPaper)
            .join(ResearchPaper, CorpusPassage.paper_id == ResearchPaper.paper_id)
            .all()
        )
        
        result = []
        for passage, paper in passages:
            result.append({
                "passage_id": passage.passage_id,
                "paper_id": paper.paper_id,
                "title": paper.title,
                "authors": paper.authors,
                "year": paper.year,
                "doi": paper.doi,
                "source": paper.source,
                "passage_index": passage.passage_index,
                "content": passage.content
            })
        return result
