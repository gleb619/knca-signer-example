package knca.signer.example;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@CrossOrigin(origins = "*")
public class DocumentController {

    @Autowired
    private DocumentService documentService;

    @GetMapping
    public List<Document> getAllDocuments() {
        return documentService.getAllDocuments();
    }

    @PostMapping
    public ResponseEntity<Document> createDocument(@RequestBody Map<String, String> request) {
        String content = request.get("content");
        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Document doc = documentService.createDocument(content);
        return ResponseEntity.ok(doc);
    }

    @PutMapping("/{id}/sign")
    public ResponseEntity<?> signDocument(@PathVariable String id, @RequestBody Map<String, String> request) {
        String signature = request.get("signature");
        if (signature == null || signature.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Signature is required"));
        }

        boolean success = documentService.signDocument(id, signature);
        if (success) {
            return ResponseEntity.ok(Map.of("message", "Document signed successfully"));
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Document not found or already signed"));
        }
    }
}
