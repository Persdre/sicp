import replaceTagWithSymbol from './replaceTagWithSymbol';
import processFigure from './processFigure';

const tagsToRemove = new Set(["#comment", "COMMENT", "CHANGE", "EDIT", "EXCLUDE", "HISTORY", "SCHEME", "SCHEMEINLINE", "SOLUTION"]);
const ignoreTags = new Set(["JAVASCRIPT", "SPLIT", "SPLITINLINE", "NOBR"]);

export const processTextFunctions = {
  "#text": ((node, writeTo) => {
    const trimedValue = node.nodeValue.replace(/[\r\n]+/, " ").replace(/\s+/g, " ");
    if (!trimedValue.match(/^\s*$/)) {
      writeTo.push(trimedValue.replace(/%/g, "\\%"));
    }
  }),

  "B": ((node, writeTo) => {
    writeTo.push("\\textbf{");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("}");
  }),

  "BLOCKQUOTE": ((node, writeTo) => {
    writeTo.push("\n\\begin{quote}");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("\\end{quote}\n");
  }),

  "CITATION": ((node, writeTo) => {
    // Currently just text. Not linked to biblography.
    const text = node.getElementsByTagName("TEXT")[0]; 
    if (text) {
      recursiveProcessText(text.firstChild, writeTo);
    } else {
      recursiveProcessText(node.firstChild, writeTo);
    }
  }),

  "EM": ((node, writeTo) => processTextFunctions["em"](node, writeTo)),
  "em": ((node, writeTo) => {
    writeTo.push("{\\em ");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("}");
  }),

  "EXERCISE": ((node, writeTo) => {
    writeTo.push("\n\\begin{Exercise}\n");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("\n\\end{Exercise}\n");
  }),

  "FIGURE": ((node, writeTo) => {
    processFigure(node, writeTo);
  }),

  "IMAGE": ((node, writeTo) => {
    writeTo.push("\n\\includegraphics{" 
    + node.getAttribute("src").replace(/\.gif$/, ".png").replace(/_/g, "\\string_")
    + "}\n");
  }),

  "FOOTNOTE": ((node, writeTo) => {
    writeTo.push("\n\\cprotect\\footnote{");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("}\n");
  }),

  "H2": ((node, writeTo) => {
    writeTo.push("\n\\subsection*{");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("}\n");
  }),

  "INDEX": ((node, writeTo) => {
    processIndex(node, writeTo);
  }),

  "LABEL": ((node, writeTo) => {
    writeTo.push("\\label{"
      + node.getAttribute("NAME")
      + "}\n");
  }),

  "LINK": ((node, writeTo) => {
    writeTo.push("\\href{"
      + node.getAttribute("address")
      + "}{");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("}");
  }),

  "LATEX": ((node, writeTo) => processTextFunctions["LATEXINLINE"](node, writeTo)),
  "LATEXINLINE": ((node, writeTo) => {
    recursiveProcessPureText(node.firstChild, writeTo);
  }),

  "NAME": ((node, writeTo) => {
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("}\n");
  }),

  "OL": ((node, writeTo) => {
    writeTo.push("\n\\begin{enumerate}\n");
    processList(node.firstChild, writeTo);
    writeTo.push("\\end{enumerate}\n");
  }),

  "P": ((node, writeTo) => processTextFunctions["TEXT"](node, writeTo)),
  "TEXT": ((node, writeTo) => {
    writeTo.push("\n\n");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("\n");
  }),

  "QUOTE": ((node, writeTo) => {
    writeTo.push("\\enquote{");
    recursiveProcessText(node.firstChild, writeTo);
    writeTo.push("}");
  }),

  "REF": ((node, writeTo) => {
    writeTo.push("~\\ref{" 
      + node.getAttribute("NAME")
      + "}");
  }),

  "SCHEMEINLINE": ((node, writeTo) => processTextFunctions["JAVASCRIPTINLINE"](node, writeTo)),
  "JAVASCRIPTINLINE": ((node, writeTo) => {
    writeTo.push("\n{\\lstinline|");
    recursiveProcessPureText(node.firstChild, writeTo, true);
    writeTo.push("|}");
  }),

  "SNIPPET": ((node, writeTo) => {
    processSnippet(node, writeTo);
  }),

  "SUBHEADING": ((node, writeTo) => {
    writeTo.push("\\subsubsection{");
    recursiveProcessText(node.firstChild, writeTo);
  }),

  "TABLE": ((node, writeTo) => {
    processTable(node, writeTo);
  }),

  "TT": ((node, writeTo) => {
    writeTo.push("\\texttt{");
    recursiveProcessPureText(node.firstChild, writeTo, true);
    writeTo.push("}");
  }),

  "UL": ((node, writeTo) => {
    writeTo.push("\n\\begin{itemize}\n");
    processList(node.firstChild, writeTo);
    writeTo.push("\\end{itemize}\n");
  })
}

const recursiveProcessPureText = (node, writeTo, removeNewline = false) => {
  if (!node) return;
  if (!replaceTagWithSymbol(node, writeTo)) {
    if (removeNewline) {
      writeTo.push(node.nodeValue.replace(/[\r\n]+/g, " "));
    } else {
      writeTo.push(node.nodeValue);
    }
  }
  return recursiveProcessPureText(node.nextSibling, writeTo)
}

export const recursiveProcessText = (node, writeTo) => {
  if (!node) return;
  if (!processText(node, writeTo)){
    console.log("recusive process:\n" + node.toString());
  }
  return recursiveProcessText(node.nextSibling, writeTo)
}

export const processText = (node, writeTo) => {
  const name = node.nodeName;
  if (processTextFunctions[name]) {
    processTextFunctions[name](node, writeTo);
    return true;
  } else {
    if (replaceTagWithSymbol(node, writeTo) || tagsToRemove.has(name)) {
      return true;
    } else if (ignoreTags.has(name)) {
      recursiveProcessText(node.firstChild, writeTo);
      return true;
    } else {
      return false;
    }
  }
}

export const processIndex = (index, writeTo) => {
  writeTo.push("\\index{");
  for (let child = index.firstChild; child; child = child.nextSibling) {
    const name = child.nodeName;
    switch (name) {
      case "SUBINDEX":
        writeTo.push("!");
        recursiveProcessText(child.firstChild, writeTo);
        break;

      default:
        processText(child, writeTo);
    }
  }
  writeTo.push("}");
}

export const processList = (node, writeTo) => {
  if (!node) return;
  if (node.nodeName == "LI"){
    writeTo.push("\\item{");
    recursiveProcessText(node.firstChild, writeTo)
    writeTo.push("}\n");
  } 
  return processList(node.nextSibling, writeTo);
}

export const processSnippet = (node, writeTo) => {
  const jsSnippet = node.getElementsByTagName("JAVASCRIPT")[0]; 
  if (jsSnippet) {
    writeTo.push("\n\\begin{lstlisting}");
    recursiveProcessPureText(jsSnippet.firstChild, writeTo);
    writeTo.push("\\end{lstlisting}\n");
  }
}

export const processTable = (node, writeTo) => {
  const firstRow = node.getElementsByTagName("TR")[0];
  if (firstRow) {
    const colNum = firstRow.getElementsByTagName("TD").length;
    writeTo.push("\n\n\\noindent\\begin{tabular}{ | ");
    for (let i = 0; i < colNum; i++) {
      writeTo.push("l | ");
    }
    writeTo.push("} \\hline\n");
    for (let row = node.firstChild; row; row = row.nextSibling) {
      if (row.nodeName != "TR") continue;
      let first = true;
      for (let col = row.firstChild; col; col = col.nextSibling) {
        if (col.nodeName != "TD") continue;
        if (first) {
          first = false;
        } else {
          writeTo.push(" & ");
        }
        recursiveProcessText(col.firstChild, writeTo);
      }
      writeTo.push(" \\\\ \\hline\n");
    }
    writeTo.push("\\end{tabular}\n\n");
  } else {
    recursiveProcessText(node.firstChild, writeTo);
  }
}