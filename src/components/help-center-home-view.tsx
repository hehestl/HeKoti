"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { HomeCategoryTreeEditor } from "@/components/home-category-tree-editor";
import { useHomeInlineEdit } from "@/components/home-inline-edit-context";
import { treeSignature, treeToCategoryMaps, type HomeTreePage } from "@/components/home-inline-edit-types";
import { InlineEditToolbar } from "@/components/inline-edit-toolbar";
import type { PathTreeNode } from "@/lib/page-tree";

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Registers home tree after mount — avoids setState during hydration. */
function HomeInlineEditRegister({
  lang,
  pathTree,
  searchMode,
}: {
  lang: string;
  pathTree: PathTreeNode<HomeTreePage>[];
  searchMode: boolean;
}) {
  const { registerTree, unregisterTree } = useHomeInlineEdit();
  const registerTreeRef = useRef(registerTree);
  const unregisterTreeRef = useRef(unregisterTree);
  const pathTreeRef = useRef(pathTree);
  registerTreeRef.current = registerTree;
  unregisterTreeRef.current = unregisterTree;
  pathTreeRef.current = pathTree;

  const treeSig = useMemo(
    () => treeSignature(treeToCategoryMaps(pathTree, lang)),
    [pathTree, lang],
  );

  useEffect(() => {
    registerTreeRef.current(lang, pathTreeRef.current, searchMode);
  }, [lang, treeSig, searchMode]);

  useEffect(() => () => unregisterTreeRef.current(), []);

  return null;
}

export function HelpCenterHomeView({
  lang,
  pathTree,
  searchMode,
  children,
}: {
  lang: string;
  pathTree: PathTreeNode<HomeTreePage>[];
  searchMode: boolean;
  children: ReactNode;
}) {
  const {
    isEditing,
    draft,
    labels,
    statusText,
    statusTone,
    patchDraft,
    reorderDraft,
    promoteToCategory,
    saveNow,
    cancelEdit,
  } = useHomeInlineEdit();

  const mounted = useMounted();

  const showEdit = mounted && isEditing && draft;

  return (
    <>
      <HomeInlineEditRegister lang={lang} pathTree={pathTree} searchMode={searchMode} />
      {showEdit ? (
        <div className="help-center wiki-inline-edit-wrap">
          <InlineEditToolbar
            saveLabel={labels.save}
            cancelLabel={labels.cancel}
            statusText={statusText}
            statusTone={statusTone}
            onSave={() => void saveNow()}
            onCancel={cancelEdit}
          />
          <HomeCategoryTreeEditor
            lang={lang}
            draft={draft}
            labels={labels}
            onPatch={patchDraft}
            onReorder={reorderDraft}
            onPromote={promoteToCategory}
          />
        </div>
      ) : (
        children
      )}
    </>
  );
}
