import {Component, ElementRef, Inject, OnInit, ViewChild} from '@angular/core';
import html2canvas from "html2canvas";
import jsPDF from 'jspdf';
import {ExamManagerService} from "../exam-manager.service";
import {Point} from "@angular/cdk/drag-drop";
import {AR} from "js-aruco";
import PerspT from "perspective-transform";
import {AnswerSheetEvaluation, AnswerState, BatchResult} from "../batch-result";
import * as JSZip from 'jszip';
import * as FileSaver from 'file-saver';
import {TensorflowCheckboxEvaluatorService} from "../tensorflow-checkbox-evaluator.service";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";

const leftPadding = 0;
const rightPadding = 50;
const topPadding = 0;
const bottomPadding = 50;
const a4width = 210 * 5 - 2 * 10 /* white padding */;
const a4height = 297 * 5 - 2 * 10 /* white padding*/;
const filledColor = "rgba(0, 200, 200, .3)";
const emptyColor = "rgba(0, 0, 200, .2)";

@Component({
  selector: 'app-document-preview',
  templateUrl: './document-preview.component.html',
  styleUrls: ['./document-preview.component.scss']
})
export class DocumentPreviewComponent implements OnInit {
  @ViewChild('pages') pages;
  @ViewChild('markingSheet', { read: ElementRef }) markingSheet: ElementRef;

  public canvWidth = leftPadding + rightPadding;
  public canvHeight = topPadding + bottomPadding;
  private batchResult: BatchResult = {sheets: {}}

  constructor(private elRef: ElementRef, public examManager: ExamManagerService, private tfEval: TensorflowCheckboxEvaluatorService, public dialog: MatDialog) {
  }

  private static flattenPoints(pts: Point[]): number[] {
    const arr: number[] = [];
    for (const pt of pts) {
      arr.push(pt.x, pt.y);
    }
    return arr;
  }

  ngOnInit(): void {
  }

  async sleep(s: number = 1) {
    await new Promise(resolve => setTimeout(resolve, 1000 * s));
  }

  async downloadPdf(event: MouseEvent) {
    console.log('downloading pdf');
    let pdf = new jsPDF();
    // preprocess svg elements for fixing problems between katex and html2canvas
    const svgElements = document.body.querySelectorAll('svg');
    svgElements.forEach(function (item) {
      item.setAttribute("width", String(item.getBoundingClientRect().width));
      item.style.width = null;
    });
    console.log(this.markingSheet);
    const pageRefs: HTMLElement[] = [this.markingSheet.nativeElement]
      .concat(Array.prototype.slice.call(this.pages.elem.nativeElement.children, 0));
    console.log(pageRefs);

    for (let i = 0; i < pageRefs.length; i++){
      let pageRef = pageRefs[i];
      if (pageRef.nodeName === 'APP-PAGES') {
        continue;
      }
      const canvas = await html2canvas(pageRef, {removeContainer: true, scale: 2});
      const contentDataURL = canvas.toDataURL('image/jpeg');
      if (i > 0) {
        pdf.addPage();
      }
      pdf.setPage(i + 1);
      await pdf.addImage(contentDataURL, 'JPEG', 0, 0, 210, 297);
    }
    pdf.save('test.pdf');
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(DocumentDownloadDialog, {
      width: '250px',
      data: {markSheet: true, sampleSheet: true, exam: true, onePdf: true}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result);
    });
  }

  markToPx(questionIndex: number, markIndex: number, truthValue: boolean):
    Point {
    const xOffset =
      50 /* marker width */ +
      100 /* question label width */;
    const yOffset =
      50 /* marker height */ +
      150 /* exam header height */ +
      10 /* spacer height */ +
      ((100 + 10) * questionIndex) /* previous question boxes' height + bottom margin */ +
      20 /* label height */;
    return {
      x: xOffset + markIndex * 30 /* checkbox width (20) + margin (10) */,
      y: yOffset + (truthValue ? 0 : 20) /* checkbox height (20) */
    }
  }
}

export interface DownloadDialogData {
  markSheet: boolean;
  sampleSheet: boolean;
  exam: boolean;
  onePdf: boolean;
}

@Component({
  selector: 'document-download-dialog',
  templateUrl: 'document-download-dialog.html',
})
export class DocumentDownloadDialog {

  constructor(
    public dialogRef: MatDialogRef<DocumentDownloadDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DownloadDialogData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

}
