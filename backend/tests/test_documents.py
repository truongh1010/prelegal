from app.core.catalog import read_catalog
from app.core.documents import DOCUMENTS, build_fields_model, build_system_prompt, get_document


def test_every_document_filename_exists_in_catalog_json():
    catalog_filenames = {entry.filename for entry in read_catalog()}
    for document in DOCUMENTS:
        assert document.filename in catalog_filenames


def test_every_catalog_entry_has_a_registered_document():
    document_filenames = {document.filename for document in DOCUMENTS}
    for entry in read_catalog():
        assert entry.filename in document_filenames


def test_slugs_and_field_keys_are_unique_within_each_document():
    slugs = [document.slug for document in DOCUMENTS]
    assert len(slugs) == len(set(slugs))

    for document in DOCUMENTS:
        keys = [field.key for field in document.fields]
        assert len(keys) == len(set(keys)), f"duplicate field key in {document.slug}"


def test_get_document_returns_none_for_unknown_slug():
    assert get_document("not-a-real-slug") is None
    assert get_document("mutual-nda") is not None


def test_build_fields_model_has_every_field_as_an_optional_string():
    document = get_document("csa")
    model = build_fields_model(document)

    instance = model()
    for field in document.fields:
        assert getattr(instance, field.key) is None


def test_build_system_prompt_lists_every_field_key():
    document = get_document("dpa")
    prompt = build_system_prompt(document)

    for field in document.fields:
        assert field.key in prompt
